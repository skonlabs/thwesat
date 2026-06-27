
-- ============================================================================
-- PHASE A: Schema cleanup (SQL only). Code will be rewired in Phase B.
-- ============================================================================

-- 1) Drop views that block downstream renames/drops
DROP VIEW IF EXISTS public.v_user_directory CASCADE;
DROP VIEW IF EXISTS public.employer_profiles_public CASCADE;

-- 2) Drop RPCs that hard-depend on tables we are about to remove.
--    (Phase B will rebuild whatever is still needed.)
DROP FUNCTION IF EXISTS public.review_payment_request(uuid, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.review_payment_request(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_record_payment_reversal(uuid, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_record_payment_reversal(uuid, numeric, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_set_payment_revenue_overrides(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.guard_reversal_cap() CASCADE;
DROP FUNCTION IF EXISTS public.admin_compute_partner_statement(uuid, int, int) CASCADE;
DROP FUNCTION IF EXISTS public.admin_compute_partner_statement(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.admin_finalize_partner_statement(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_placement_fee_invoice(uuid, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_placement_fee_invoice(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.placement_confirm_with_invoice(uuid, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.placement_confirm_with_invoice(uuid, numeric, numeric, text) CASCADE;

-- 3) Drop tables (CASCADE handles FKs from partner_profiles, partner_attributions,
--    partner_monthly_statements, partner_referral_codes, jobs.agent_client_id, etc.)
DROP TABLE IF EXISTS public.scam_reports CASCADE;
DROP TABLE IF EXISTS public.payment_reversals CASCADE;
DROP TABLE IF EXISTS public.payment_requests CASCADE;
DROP TABLE IF EXISTS public.partner_quality_metrics CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.agent_clients CASCADE;
DROP TABLE IF EXISTS public.addon_purchases CASCADE;

-- jobs.agent_client_id may survive (FK was cascaded but column remains) -> drop it
ALTER TABLE public.jobs DROP COLUMN IF EXISTS agent_client_id;

-- 4) wallet_transactions audit-column drops
ALTER TABLE public.wallet_transactions
  DROP COLUMN IF EXISTS note,
  DROP COLUMN IF EXISTS metadata;

-- 5) job_status_history.metadata
ALTER TABLE public.job_status_history DROP COLUMN IF EXISTS metadata;

-- 6) application_status_history.metadata
ALTER TABLE public.application_status_history DROP COLUMN IF EXISTS metadata;

-- 7) subscription_plans + subscription_quotas: drop unlimited flags, rename quota
ALTER TABLE public.subscription_plans
  DROP COLUMN IF EXISTS is_unlimited_jobs,
  DROP COLUMN IF EXISTS is_unlimited_unlocks;
ALTER TABLE public.subscription_plans RENAME COLUMN active_jobs_quota TO job_postings_quota;

ALTER TABLE public.subscription_quotas
  DROP COLUMN IF EXISTS is_unlimited_jobs,
  DROP COLUMN IF EXISTS is_unlimited_unlocks;
ALTER TABLE public.subscription_quotas RENAME COLUMN active_jobs_quota TO job_postings_quota;

-- 8) partner_monthly_statements: drop 26 listed payout columns
ALTER TABLE public.partner_monthly_statements
  DROP COLUMN IF EXISTS gross_attributed_npr,
  DROP COLUMN IF EXISTS reversals_npr,
  DROP COLUMN IF EXISTS net_collected_attributed_npr,
  DROP COLUMN IF EXISTS growth_npr,
  DROP COLUMN IF EXISTS maintenance_y2_npr,
  DROP COLUMN IF EXISTS maintenance_y3_npr,
  DROP COLUMN IF EXISTS growth_tier_pct,
  DROP COLUMN IF EXISTS growth_bonus_pct,
  DROP COLUMN IF EXISTS maintenance_y2_pct,
  DROP COLUMN IF EXISTS maintenance_y3_pct,
  DROP COLUMN IF EXISTS mom_growth_pct,
  DROP COLUMN IF EXISTS active_growth_ratio,
  DROP COLUMN IF EXISTS quality_gate_passed,
  DROP COLUMN IF EXISTS active_growth_requirement_met,
  DROP COLUMN IF EXISTS growth_payout,
  DROP COLUMN IF EXISTS maintenance_payout,
  DROP COLUMN IF EXISTS bonus_payout,
  DROP COLUMN IF EXISTS total_payout_uncapped,
  DROP COLUMN IF EXISTS total_payout,
  DROP COLUMN IF EXISTS cap_applied,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS paid_at,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS growth_npr_gross,
  DROP COLUMN IF EXISTS maintenance_y2_npr_gross,
  DROP COLUMN IF EXISTS maintenance_y3_npr_gross;

-- 9) topup_requests: add created_by (created_at already exists)
ALTER TABLE public.topup_requests
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
UPDATE public.topup_requests SET created_by = user_id WHERE created_by IS NULL;

-- 10) Rename profiles view -> v_profiles (triggers move with it automatically)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='profiles') THEN
    EXECUTE 'ALTER VIEW public.profiles RENAME TO v_profiles';
  END IF;
END$$;

-- Re-apply grants on the renamed view (anon/authenticated SELECT; column-level
-- REVOKEs on PII; authenticated UPDATE for INSTEAD OF trigger writes).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v_profiles TO authenticated;
GRANT SELECT ON public.v_profiles TO anon;
GRANT ALL ON public.v_profiles TO service_role;
REVOKE SELECT (email, phone) ON public.v_profiles FROM anon;
REVOKE SELECT (email, phone) ON public.v_profiles FROM authenticated;

-- 11) Rename cv_documents -> user_documents; constrain file_type
ALTER TABLE public.cv_documents RENAME TO user_documents;

UPDATE public.user_documents
  SET file_type = CASE
    WHEN file_type ILIKE '%cover%'                              THEN 'Cover'
    WHEN file_type ILIKE '%cv%' OR file_type ILIKE '%resume%'   THEN 'Resume'
    WHEN file_type IN ('Resume','Cover','Others')               THEN file_type
    ELSE 'Resume'
  END;
ALTER TABLE public.user_documents ALTER COLUMN file_type SET DEFAULT 'Resume';
ALTER TABLE public.user_documents
  DROP CONSTRAINT IF EXISTS user_documents_file_type_check;
ALTER TABLE public.user_documents
  ADD CONSTRAINT user_documents_file_type_check
  CHECK (file_type IN ('Resume','Cover','Others'));

-- 12) applications: drop free-text cover_letter, add cover_letter_id + resume_id
ALTER TABLE public.applications DROP COLUMN IF EXISTS cover_letter;
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS cover_letter_id uuid REFERENCES public.user_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resume_id       uuid REFERENCES public.user_documents(id) ON DELETE SET NULL;

-- 13) Update sync_job_quotas to use job_postings_quota (column already renamed;
--     the function body references active_jobs_used and featured_jobs_used only,
--     so it still works. No change needed but recreate to confirm.)

-- 14) Update tick_expire_subscriptions: remove addon_purchases dependency
CREATE OR REPLACE FUNCTION public.tick_expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- addon_purchases removed; expirations now tracked via feature_unlocks
  UPDATE public.feature_unlocks
    SET is_active = false
    WHERE is_active = true
      AND expires_at IS NOT NULL
      AND expires_at < now();
END;
$function$;

-- 15) Rewrite approve_subscription_payment so it no longer writes to
--     addon_purchases and no longer references is_unlimited_* or feature_unlocks.credits_spent.
CREATE OR REPLACE FUNCTION public.approve_subscription_payment(p_request_id uuid, p_admin_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  req public.subscription_payment_requests;
  plan public.subscription_plans;
  addon public.addon_products;
  v_qty int;
  v_already_trial int;
  v_caller uuid := auth.uid();
  v_expires timestamptz;
  v_base timestamptz;
BEGIN
  IF NOT (public.has_role(v_caller, 'admin'::public.app_role)
       OR public.has_role(v_caller, 'partner'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admins or partners can approve payments';
  END IF;

  SELECT * INTO req FROM public.subscription_payment_requests
    WHERE id = p_request_id AND status='pending' FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  IF req.request_type = 'subscription' THEN
    SELECT * INTO plan FROM public.subscription_plans WHERE id = req.plan_id;
    IF plan IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;

    IF plan.tier = 'free_trial' THEN
      SELECT count(*) INTO v_already_trial
        FROM public.subscriptions s
        JOIN public.subscription_plans p ON p.id = s.plan_id
        WHERE s.user_id = req.user_id AND p.tier = 'free_trial';
      IF v_already_trial > 0 THEN
        RAISE EXCEPTION 'Free Trial can only be claimed once per user';
      END IF;
    END IF;

    INSERT INTO public.subscriptions(user_id, plan_id, status, started_at, mmk_paid)
      VALUES (req.user_id, req.plan_id, 'active', now(), req.mmk_amount);

    INSERT INTO public.subscription_quotas(
      user_id, job_postings_quota, active_jobs_used,
      unlocks_total, unlocks_used, featured_jobs_total, featured_jobs_used
    ) VALUES (
      req.user_id,
      plan.job_postings_quota, 0,
      plan.unlock_quota, 0, plan.featured_jobs_quota, 0
    )
    ON CONFLICT (user_id) DO UPDATE SET
      job_postings_quota   = public.subscription_quotas.job_postings_quota + EXCLUDED.job_postings_quota,
      unlocks_total        = public.subscription_quotas.unlocks_total + EXCLUDED.unlocks_total,
      featured_jobs_total  = public.subscription_quotas.featured_jobs_total + EXCLUDED.featured_jobs_total,
      updated_at           = now();

  ELSE
    SELECT * INTO addon FROM public.addon_products WHERE id = req.addon_id;
    IF addon IS NULL THEN RAISE EXCEPTION 'Add-on not found'; END IF;

    v_qty := GREATEST(1, COALESCE(req.quantity, 1));
    INSERT INTO public.subscription_quotas(user_id) VALUES (req.user_id) ON CONFLICT DO NOTHING;

    IF addon.is_per_unit AND addon.kind = 'unlock_pack' THEN
      UPDATE public.subscription_quotas
        SET unlocks_total = unlocks_total + v_qty, updated_at = now()
        WHERE user_id = req.user_id;
    ELSIF addon.is_per_unit AND addon.kind = 'featured_job' THEN
      UPDATE public.subscription_quotas
        SET featured_jobs_total = featured_jobs_total + v_qty, updated_at = now()
        WHERE user_id = req.user_id;
    ELSIF addon.is_per_unit AND addon.kind = 'job_post' THEN
      UPDATE public.subscription_quotas
        SET job_postings_quota = job_postings_quota + v_qty, updated_at = now()
        WHERE user_id = req.user_id;
    ELSIF addon.kind = 'profile_boost' THEN
      SELECT MAX(expires_at) INTO v_base
        FROM public.feature_unlocks
        WHERE user_id = req.user_id
          AND feature_key = 'profile_boost'
          AND is_active = true
          AND expires_at IS NOT NULL
          AND expires_at > now();
      v_base := COALESCE(v_base, now());
      v_expires := CASE
        WHEN addon.duration_days IS NOT NULL
          THEN v_base + (addon.duration_days || ' days')::interval
        ELSE NULL
      END;
      UPDATE public.feature_unlocks
        SET is_active = false
        WHERE user_id = req.user_id AND feature_key = 'profile_boost' AND is_active = true;
      INSERT INTO public.feature_unlocks(user_id, feature_key, target_type, target_id, is_active, expires_at, metadata)
        VALUES (req.user_id, 'profile_boost', 'profile', req.user_id::text, true, v_expires,
                jsonb_build_object('source','addon','addon_id',addon.id));
      INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
        VALUES (
          req.user_id, 'system',
          'Profile Boost activated', 'ပရိုဖိုင် Boost အသက်ဝင်ပါပြီ',
          'Your profile will appear at the top of employer searches until ' || to_char(v_expires AT TIME ZONE 'UTC', 'YYYY-MM-DD') || '.',
          'အလုပ်ရှင်များ ရှာဖွေမှုများတွင် ' || to_char(v_expires AT TIME ZONE 'UTC', 'YYYY-MM-DD') || ' အထိ ထိပ်တွင် ပေါ်လာပါမည်။',
          '/profile'
        );
    ELSE
      -- Other addon kinds (matching/branding): record a feature_unlocks row
      INSERT INTO public.feature_unlocks(user_id, feature_key, target_type, target_id, is_active, expires_at, metadata)
        VALUES (
          req.user_id, addon.key, 'addon', addon.id::text, true,
          CASE WHEN addon.duration_days IS NOT NULL
               THEN now() + (addon.duration_days || ' days')::interval
               ELSE NULL END,
          jsonb_build_object('addon_id', addon.id, 'mmk_paid', req.mmk_amount)
        );
    END IF;
  END IF;

  UPDATE public.subscription_payment_requests
    SET status='approved', reviewed_by = v_caller, reviewed_at = now(),
        admin_note = COALESCE(p_admin_note, admin_note), updated_at = now()
    WHERE id = p_request_id;
END;
$function$;
