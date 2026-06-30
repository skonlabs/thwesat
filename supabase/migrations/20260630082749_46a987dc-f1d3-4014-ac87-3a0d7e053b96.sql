-- 1) Ensure wallet transaction mirroring matches the partial unique index used by the ledger.
-- This prevents package/add-on purchase failures caused by an ON CONFLICT target mismatch.
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

-- 2) Restore read policy for community posts. Without this, returning newly-created
-- pending posts is blocked by RLS and users cannot see their own pending posts.
DROP POLICY IF EXISTS "Approved posts readable; own/admin pending visible" ON public.community_posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON public.community_posts;
DROP POLICY IF EXISTS "Approved posts visible; own pending visible" ON public.community_posts;

CREATE POLICY "Approved posts readable; own/admin pending visible"
ON public.community_posts
FOR SELECT
TO authenticated
USING (
  COALESCE(is_approved, false) = true
  OR author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'partner'::public.app_role)
);

-- 3) Restore app_config admin management while keeping public config reads scoped.
GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

DROP POLICY IF EXISTS "Admins can manage app config" ON public.app_config;
DROP POLICY IF EXISTS "Admins read app config" ON public.app_config;
DROP POLICY IF EXISTS "Authenticated read public config keys" ON public.app_config;
DROP POLICY IF EXISTS "Public read safe app config keys" ON public.app_config;

CREATE POLICY "Public read safe app config keys"
ON public.app_config
FOR SELECT
TO anon, authenticated
USING (key IN ('telegram_bot', 'payment_accounts', 'receiving_account', 'referral_rewards'));

CREATE POLICY "Admins can manage app config"
ON public.app_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));