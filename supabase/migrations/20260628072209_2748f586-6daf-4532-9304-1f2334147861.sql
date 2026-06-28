
-- ===== 1. subscription_payment_requests: extend to cover placement_fee + mentor_session =====
ALTER TABLE public.subscription_payment_requests
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.mentor_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MMK',
  ADD COLUMN IF NOT EXISTS third_party_payout numeric,
  ADD COLUMN IF NOT EXISTS npr_amount numeric,
  ADD COLUMN IF NOT EXISTS revenue_classification text;

-- Backfill amount from mmk_amount for legacy rows
UPDATE public.subscription_payment_requests SET amount = mmk_amount WHERE amount IS NULL;

-- ===== 2. contact_messages: support scam/report entities =====
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid;

-- ===== 3. partner_monthly_statements: quality metric columns =====
ALTER TABLE public.partner_monthly_statements
  ADD COLUMN IF NOT EXISTS l1_sla_pct numeric,
  ADD COLUMN IF NOT EXISTS csat_score numeric;

-- ===== 4. agent_profiles: clients JSONB list =====
ALTER TABLE public.agent_profiles
  ADD COLUMN IF NOT EXISTS clients jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ===== 5. review_payment_request RPC (atomic approve/reject/revoke for placement_fee + mentor_session) =====
CREATE OR REPLACE FUNCTION public.review_payment_request(
  _payment_id uuid,
  _new_status text,
  _admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.subscription_payment_requests%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _new_status NOT IN ('approved','rejected','revoked') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;
  SELECT * INTO v_row FROM public.subscription_payment_requests WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v_row.status = _new_status THEN
    RETURN jsonb_build_object('ok', true, 'status', _new_status, 'noop', true);
  END IF;

  UPDATE public.subscription_payment_requests
     SET status = _new_status,
         admin_note = COALESCE(_admin_note, admin_note),
         reviewed_by = v_caller,
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _payment_id;

  -- Side effects for mentor_session
  IF v_row.payment_type = 'mentor_session' AND v_row.booking_id IS NOT NULL THEN
    UPDATE public.mentor_bookings
       SET payment_status = CASE
             WHEN _new_status = 'approved' THEN 'paid'
             WHEN _new_status = 'rejected' THEN 'unpaid'
             ELSE payment_status END,
           updated_at = now()
     WHERE id = v_row.booking_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.review_payment_request(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_payment_request(uuid,text,text) TO authenticated;
