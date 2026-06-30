-- Fix subscription/add-on payment mirroring into wallet_transactions.
-- The existing trigger used ON CONFLICT (source_table, source_id) without the
-- partial-index predicate, which fails because the live unique index is partial.
-- It also wrote subscription request statuses/kinds that were not valid ledger values.

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_kind_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_kind_check
  CHECK (kind = ANY (ARRAY[
    'topup'::text,
    'spend'::text,
    'earning'::text,
    'escrow_hold'::text,
    'escrow_release'::text,
    'refund'::text,
    'adjustment'::text,
    'migration'::text,
    'payout'::text,
    'subscription'::text,
    'addon'::text,
    'mentor_session'::text,
    'placement_fee'::text
  ]));

CREATE OR REPLACE FUNCTION public._mirror_spr_to_wallet_tx()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_kind text;
  v_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.wallet_transactions
      WHERE source_table = 'subscription_payment_requests'
        AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  v_kind := CASE
    WHEN NEW.request_type = 'subscription' THEN 'subscription'
    WHEN NEW.request_type = 'addon' THEN 'addon'
    WHEN NEW.payment_type = 'mentor_session' THEN 'mentor_session'
    WHEN NEW.payment_type = 'placement_fee' THEN 'placement_fee'
    ELSE COALESCE(NEW.payment_type, NEW.request_type, 'subscription')
  END;

  v_status := CASE NEW.status
    WHEN 'approved' THEN 'completed'
    WHEN 'rejected' THEN 'failed'
    WHEN 'pending' THEN 'pending'
    ELSE 'reversed'
  END;

  INSERT INTO public.wallet_transactions(
    user_id, kind, credits, mmk_amount, status, currency,
    payment_method, proof_url, sender_reference, admin_note,
    reviewed_by, reviewed_at, plan_id, addon_id, booking_id,
    quantity, payment_type, request_type, reference_id, amount,
    npr_amount, revenue_classification, third_party_payout,
    metadata, created_at, updated_at, source_table, source_id,
    ref_type, ref_id
  ) VALUES (
    NEW.user_id, v_kind, 0,
    NEW.mmk_amount, v_status, COALESCE(NEW.currency,'MMK'),
    NEW.payment_method, NEW.proof_url, NEW.sender_reference,
    NEW.admin_note, NEW.reviewed_by, NEW.reviewed_at,
    NEW.plan_id, NEW.addon_id, NEW.booking_id,
    COALESCE(NEW.quantity,1), NEW.payment_type, NEW.request_type,
    NEW.reference_id, NEW.amount, NEW.npr_amount,
    NEW.revenue_classification, NEW.third_party_payout,
    '{}'::jsonb, NEW.created_at, NEW.updated_at,
    'subscription_payment_requests', NEW.id,
    NEW.request_type, NEW.id::text
  )
  ON CONFLICT (source_table, source_id)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL
  DO UPDATE SET
    kind = EXCLUDED.kind,
    status = EXCLUDED.status,
    mmk_amount = EXCLUDED.mmk_amount,
    currency = EXCLUDED.currency,
    payment_method = EXCLUDED.payment_method,
    proof_url = EXCLUDED.proof_url,
    sender_reference = EXCLUDED.sender_reference,
    admin_note = EXCLUDED.admin_note,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at,
    plan_id = EXCLUDED.plan_id,
    addon_id = EXCLUDED.addon_id,
    booking_id = EXCLUDED.booking_id,
    quantity = EXCLUDED.quantity,
    payment_type = EXCLUDED.payment_type,
    request_type = EXCLUDED.request_type,
    reference_id = EXCLUDED.reference_id,
    amount = EXCLUDED.amount,
    npr_amount = EXCLUDED.npr_amount,
    revenue_classification = EXCLUDED.revenue_classification,
    third_party_payout = EXCLUDED.third_party_payout,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- Keep top-up approval idempotent: the topup_requests update trigger is the
-- single ledger writer, so this RPC should only approve the request and apply balance.
CREATE OR REPLACE FUNCTION public.wallet_topup_approve(_topup_id uuid, _admin_note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t public.topup_requests%ROWTYPE;
  v_caller uuid := auth.uid();
  v_total_credits bigint;
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::public.app_role) OR public.has_role(v_caller,'partner'::public.app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO t FROM public.topup_requests WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup_not_found'; END IF;
  IF t.status = 'approved' THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;
  IF t.status <> 'pending' THEN RAISE EXCEPTION 'invalid_transition'; END IF;

  v_total_credits := t.credits_to_grant;

  UPDATE public.topup_requests
     SET status = 'approved',
         reviewed_by = v_caller,
         reviewed_at = now(),
         admin_note = COALESCE(_admin_note, admin_note),
         updated_at = now()
   WHERE id = _topup_id;

  PERFORM public._wallet_apply(t.user_id, v_total_credits, t.mmk_amount);

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'topup_approved', 'topup_request', _topup_id::text,
          jsonb_build_object('mmk_amount', t.mmk_amount, 'credits', v_total_credits));

  RETURN jsonb_build_object('ok', true, 'credits', v_total_credits);
END;
$function$;