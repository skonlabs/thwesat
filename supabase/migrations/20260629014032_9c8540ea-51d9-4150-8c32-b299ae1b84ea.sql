
-- ============================================================
-- Make wallet_transactions the single source of truth for all
-- financial flows (top-ups, subscriptions, add-ons, mentor
-- sessions, placement fees, spends, bonuses, refunds).
-- ============================================================

-- 1) Extend wallet_transactions with the full set of columns we
--    need to represent any intake / approval / ledger entry.
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MMK',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS sender_reference text,
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_id uuid,
  ADD COLUMN IF NOT EXISTS addon_id uuid,
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS package_id uuid,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS npr_amount numeric,
  ADD COLUMN IF NOT EXISTS revenue_classification text,
  ADD COLUMN IF NOT EXISTS third_party_payout numeric,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS source_table text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

-- Unique link back to legacy rows so mirror triggers are idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_source_uidx
  ON public.wallet_transactions(source_table, source_id)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wallet_transactions_user_status_kind_idx
  ON public.wallet_transactions(user_id, status, kind, created_at DESC);

-- Make sure updated_at moves with edits.
CREATE OR REPLACE FUNCTION public._wallet_tx_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_wallet_tx_touch_updated_at ON public.wallet_transactions;
CREATE TRIGGER trg_wallet_tx_touch_updated_at
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public._wallet_tx_touch_updated_at();

-- 2) Ensure every user (any role) has a wallets row so balance is
--    universally tracked. Backfill + trigger for new users.
INSERT INTO public.wallets(user_id)
SELECT u.id FROM auth.users u
LEFT JOIN public.wallets w ON w.user_id = u.id
WHERE w.user_id IS NULL;

CREATE OR REPLACE FUNCTION public._ensure_wallet_for_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.wallets(user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

-- Backfill historic top-ups + subscription payments into ledger.
INSERT INTO public.wallet_transactions(
  user_id, kind, credits, mmk_amount, status, currency,
  payment_method, proof_url, sender_reference, admin_note,
  reviewed_by, reviewed_at, package_id, quantity, payment_type,
  request_type, note, metadata, created_at, updated_at,
  source_table, source_id, ref_type, ref_id
)
SELECT
  t.user_id,
  'topup',
  CASE WHEN t.status = 'approved' THEN t.credits_to_grant ELSE 0 END,
  t.mmk_amount,
  t.status,
  'MMK',
  t.payment_method,
  t.proof_url,
  t.sender_reference,
  t.admin_note,
  t.reviewed_by,
  t.reviewed_at,
  t.package_id,
  1,
  'wallet_topup',
  'topup',
  'Wallet top-up',
  jsonb_build_object('credits_to_grant', t.credits_to_grant),
  t.created_at,
  t.updated_at,
  'topup_requests',
  t.id,
  'topup_request',
  t.id::text
FROM public.topup_requests t
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallet_transactions wt
   WHERE wt.source_table='topup_requests' AND wt.source_id = t.id
);

INSERT INTO public.wallet_transactions(
  user_id, kind, credits, mmk_amount, status, currency,
  payment_method, proof_url, sender_reference, admin_note,
  reviewed_by, reviewed_at, plan_id, addon_id, booking_id,
  quantity, payment_type, request_type, reference_id, amount,
  npr_amount, revenue_classification, third_party_payout,
  metadata, created_at, updated_at, source_table, source_id,
  ref_type, ref_id
)
SELECT
  s.user_id,
  CASE
    WHEN s.request_type = 'subscription' THEN 'subscription'
    WHEN s.request_type = 'addon' THEN 'addon'
    WHEN s.payment_type = 'mentor_session' THEN 'mentor_session'
    WHEN s.payment_type = 'placement_fee' THEN 'placement_fee'
    ELSE COALESCE(s.payment_type, s.request_type, 'subscription')
  END,
  0,
  s.mmk_amount,
  s.status,
  COALESCE(s.currency, 'MMK'),
  s.payment_method,
  s.proof_url,
  s.sender_reference,
  s.admin_note,
  s.reviewed_by,
  s.reviewed_at,
  s.plan_id,
  s.addon_id,
  s.booking_id,
  COALESCE(s.quantity, 1),
  s.payment_type,
  s.request_type,
  s.reference_id,
  s.amount,
  s.npr_amount,
  s.revenue_classification,
  s.third_party_payout,
  '{}'::jsonb,
  s.created_at,
  s.updated_at,
  'subscription_payment_requests',
  s.id,
  s.request_type,
  s.id::text
FROM public.subscription_payment_requests s
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallet_transactions wt
   WHERE wt.source_table='subscription_payment_requests' AND wt.source_id = s.id
);

-- 3) Mirror triggers: any future insert/update/delete on legacy
--    tables writes through to wallet_transactions.

CREATE OR REPLACE FUNCTION public._mirror_topup_to_wallet_tx()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.wallet_transactions
      WHERE source_table='topup_requests' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.wallet_transactions(
    user_id, kind, credits, mmk_amount, status, currency,
    payment_method, proof_url, sender_reference, admin_note,
    reviewed_by, reviewed_at, package_id, quantity, payment_type,
    request_type, note, metadata, created_at, updated_at,
    source_table, source_id, ref_type, ref_id
  ) VALUES (
    NEW.user_id, 'topup',
    CASE WHEN NEW.status='approved' THEN NEW.credits_to_grant ELSE 0 END,
    NEW.mmk_amount, NEW.status, 'MMK',
    NEW.payment_method, NEW.proof_url, NEW.sender_reference,
    NEW.admin_note, NEW.reviewed_by, NEW.reviewed_at,
    NEW.package_id, 1, 'wallet_topup', 'topup', 'Wallet top-up',
    jsonb_build_object('credits_to_grant', NEW.credits_to_grant),
    NEW.created_at, NEW.updated_at,
    'topup_requests', NEW.id, 'topup_request', NEW.id::text
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    credits = EXCLUDED.credits,
    status = EXCLUDED.status,
    admin_note = EXCLUDED.admin_note,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at,
    payment_method = EXCLUDED.payment_method,
    proof_url = EXCLUDED.proof_url,
    sender_reference = EXCLUDED.sender_reference,
    package_id = EXCLUDED.package_id,
    mmk_amount = EXCLUDED.mmk_amount,
    updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mirror_topup_to_wallet_tx ON public.topup_requests;
CREATE TRIGGER trg_mirror_topup_to_wallet_tx
  AFTER INSERT OR UPDATE OR DELETE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION public._mirror_topup_to_wallet_tx();

CREATE OR REPLACE FUNCTION public._mirror_spr_to_wallet_tx()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_kind text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.wallet_transactions
      WHERE source_table='subscription_payment_requests' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  v_kind := CASE
    WHEN NEW.request_type = 'subscription' THEN 'subscription'
    WHEN NEW.request_type = 'addon' THEN 'addon'
    WHEN NEW.payment_type = 'mentor_session' THEN 'mentor_session'
    WHEN NEW.payment_type = 'placement_fee' THEN 'placement_fee'
    ELSE COALESCE(NEW.payment_type, NEW.request_type, 'subscription')
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
    NEW.mmk_amount, NEW.status, COALESCE(NEW.currency,'MMK'),
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
  ON CONFLICT (source_table, source_id) DO UPDATE SET
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
END $$;

DROP TRIGGER IF EXISTS trg_mirror_spr_to_wallet_tx ON public.subscription_payment_requests;
CREATE TRIGGER trg_mirror_spr_to_wallet_tx
  AFTER INSERT OR UPDATE OR DELETE ON public.subscription_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public._mirror_spr_to_wallet_tx();

-- 4) Fix wallet_spend (the prior version referenced columns that
--    didn't exist — note/metadata/created_by are now real cols).
--    No-op other than re-asserting the definition now that the
--    schema matches.
CREATE OR REPLACE FUNCTION public.wallet_spend(
  _action_key text, _target_type text, _target_id text,
  _idempotency_key text, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid := auth.uid(); v_price bigint; v_existing uuid; v_tx uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _idempotency_key IS NULL OR length(trim(_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'idempotency_key_required';
  END IF;
  SELECT id INTO v_existing FROM public.wallet_transactions
    WHERE user_id = v_user AND idempotency_key = _idempotency_key LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok',true,'transaction_id',v_existing,'duplicate',true);
  END IF;
  SELECT price_credits INTO v_price FROM public.action_prices
    WHERE action_key=_action_key AND is_active=true;
  IF v_price IS NULL THEN RAISE EXCEPTION 'price_not_found' USING HINT=_action_key; END IF;
  INSERT INTO public.wallets(user_id) VALUES (v_user) ON CONFLICT DO NOTHING;
  INSERT INTO public.wallet_transactions(
    user_id, kind, credits, status, ref_type, ref_id,
    note, idempotency_key, metadata, created_by
  )
  VALUES (
    v_user, 'spend', -v_price, 'completed', _target_type, _target_id,
    _action_key, _idempotency_key, _metadata, v_user
  )
  RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(v_user, -v_price, 0);
  RETURN jsonb_build_object('ok',true,'transaction_id',v_tx,'credits_spent',v_price);
END $$;

-- 5) Grants on the new columns/ledger semantics.
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL    ON public.wallet_transactions TO service_role;
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL    ON public.wallets TO service_role;
