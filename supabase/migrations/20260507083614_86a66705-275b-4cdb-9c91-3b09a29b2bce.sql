
-- 1. Remove moderator write access on payment_requests (read-only is fine for triage)
DROP POLICY IF EXISTS "Moderators can update payment requests" ON public.payment_requests;

-- 2. Audited mentor payout function (admin only, idempotent, logs to admin_audit_log)
CREATE OR REPLACE FUNCTION public.mentor_payout_mark_paid(_earning_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.mentor_earnings%ROWTYPE;
  v_caller uuid := auth.uid();
  v_now timestamptz := now();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized: only admins can release payouts';
  END IF;

  SELECT * INTO e FROM public.mentor_earnings WHERE id = _earning_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'earning_not_found'; END IF;
  IF e.status = 'paid' OR e.paid_out_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'noop', true);
  END IF;

  UPDATE public.mentor_earnings
    SET status = 'paid',
        paid_out_at = v_now,
        payout_note = COALESCE(NULLIF(trim(_note), ''), payout_note),
        updated_at = v_now
    WHERE id = _earning_id;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'mentor_payout', 'mentor_earning', _earning_id::text,
          jsonb_build_object('mentor_id', e.mentor_id, 'amount', e.amount, 'currency', e.currency, 'booking_id', e.booking_id, 'note', _note));

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.mentor_payout_mark_paid(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.mentor_payout_mark_paid(uuid, text) TO authenticated;
