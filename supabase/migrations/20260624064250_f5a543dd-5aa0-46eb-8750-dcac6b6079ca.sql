
-- Batch A: RLS / RPC hardening for Job Seeker surfaces
-- 1) Restrict applicant-side UPDATEs on public.applications: only withdraw or
--    edit cover letter / cv reference. Block status escalation (offered, placed,
--    hired, shortlisted, rejected).
CREATE OR REPLACE FUNCTION public.applications_restrict_applicant_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the caller is the applicant (employers handled by their
  -- own UPDATE policy and admins via has_role).
  IF auth.uid() IS NULL OR auth.uid() <> NEW.applicant_id THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'moderator'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Lock columns that only employers/admins may change.
  IF NEW.rejection_reason     IS DISTINCT FROM OLD.rejection_reason     THEN NEW.rejection_reason     := OLD.rejection_reason;     END IF;
  IF NEW.rejection_reason_my  IS DISTINCT FROM OLD.rejection_reason_my  THEN NEW.rejection_reason_my  := OLD.rejection_reason_my;  END IF;
  IF NEW.shortlisted_at       IS DISTINCT FROM OLD.shortlisted_at       THEN NEW.shortlisted_at       := OLD.shortlisted_at;       END IF;
  IF NEW.offered_at           IS DISTINCT FROM OLD.offered_at           THEN NEW.offered_at           := OLD.offered_at;           END IF;
  IF NEW.hired_at             IS DISTINCT FROM OLD.hired_at             THEN NEW.hired_at             := OLD.hired_at;             END IF;
  IF NEW.placed_at            IS DISTINCT FROM OLD.placed_at            THEN NEW.placed_at            := OLD.placed_at;            END IF;

  -- Status transitions allowed to the applicant: stay the same, withdraw,
  -- decline an offer, or re-apply (back to 'applied' from withdrawn/rejected).
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'withdrawn' THEN
      -- OK
      NULL;
    ELSIF NEW.status = 'declined' AND OLD.status IN ('offered') THEN
      -- OK: decline an offer extended by the employer
      NULL;
    ELSIF NEW.status = 'applied' AND OLD.status IN ('withdrawn','rejected','declined') THEN
      -- OK: re-apply path
      NULL;
    ELSE
      RAISE EXCEPTION 'applicant_cannot_set_status_%', NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_restrict_applicant_updates ON public.applications;
CREATE TRIGGER applications_restrict_applicant_updates
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.applications_restrict_applicant_updates();

-- 2) Restrict mentee-side UPDATEs on public.mentor_bookings: only cancel a
--    pending/confirmed booking. All confirm/decline/complete actions belong to
--    the mentor.
CREATE OR REPLACE FUNCTION public.mentor_bookings_restrict_mentee_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.mentee_id THEN
    RETURN NEW;
  END IF;
  -- If the caller is also the mentor (self-booking edge case) treat as mentor.
  IF auth.uid() = NEW.mentor_id THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Lock mentor-only columns.
  IF NEW.mentor_id      IS DISTINCT FROM OLD.mentor_id      THEN NEW.mentor_id      := OLD.mentor_id;      END IF;
  IF NEW.scheduled_at   IS DISTINCT FROM OLD.scheduled_at   THEN NEW.scheduled_at   := OLD.scheduled_at;   END IF;
  IF NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes THEN NEW.duration_minutes := OLD.duration_minutes; END IF;
  IF NEW.credits_charged IS DISTINCT FROM OLD.credits_charged THEN NEW.credits_charged := OLD.credits_charged; END IF;
  IF NEW.completed_at   IS DISTINCT FROM OLD.completed_at   THEN NEW.completed_at   := OLD.completed_at;   END IF;
  IF NEW.confirmed_at   IS DISTINCT FROM OLD.confirmed_at   THEN NEW.confirmed_at   := OLD.confirmed_at;   END IF;

  -- Status transitions allowed to the mentee.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'cancelled' AND OLD.status IN ('pending','confirmed') THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'mentee_cannot_set_status_%', NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mentor_bookings_restrict_mentee_updates ON public.mentor_bookings;
CREATE TRIGGER mentor_bookings_restrict_mentee_updates
  BEFORE UPDATE ON public.mentor_bookings
  FOR EACH ROW EXECUTE FUNCTION public.mentor_bookings_restrict_mentee_updates();

-- 3) Lock mint_referral_codes to the caller's own id (admins may mint for
--    anyone).
CREATE OR REPLACE FUNCTION public.mint_referral_codes(_owner_id uuid, _count integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted int := 0;
  v_attempt int;
  v_code text;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF v_caller <> _owner_id
     AND NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden_owner_id' USING ERRCODE = '42501';
  END IF;
  IF _count IS NULL OR _count < 1 THEN _count := 1; END IF;
  IF _count > 50 THEN _count := 50; END IF;

  FOR v_attempt IN 1.._count LOOP
    LOOP
      v_code := 'TS-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));
      BEGIN
        INSERT INTO public.referral_codes(code, owner_id) VALUES (v_code, _owner_id);
        v_inserted := v_inserted + 1;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
  RETURN v_inserted;
END;
$function$;

-- 4) create_subscription_payment_request: enforce role_scope eligibility so a
--    job seeker cannot request an employer/agent plan or add-on (and vice
--    versa). Job seekers are limited to addons with role_scope = 'jobseeker'.
CREATE OR REPLACE FUNCTION public.create_subscription_payment_request(
  _request_type text,
  _plan_id uuid,
  _addon_id uuid,
  _quantity integer,
  _mmk_amount numeric,
  _payment_method text,
  _proof_url text,
  _sender_reference text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_expected numeric;
  v_id uuid;
  v_scope text;
  v_is_employer boolean;
  v_is_agent boolean;
  v_is_jobseeker boolean;
  v_is_mentor boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _request_type NOT IN ('subscription','addon') THEN RAISE EXCEPTION 'invalid_request_type'; END IF;
  IF _quantity IS NULL OR _quantity < 1 THEN _quantity := 1; END IF;

  v_is_employer  := public.has_role(v_user, 'employer'::public.app_role);
  v_is_agent     := public.has_role(v_user, 'recruiting_agent'::public.app_role);
  v_is_jobseeker := public.has_role(v_user, 'jobseeker'::public.app_role);
  v_is_mentor    := public.has_role(v_user, 'mentor'::public.app_role);

  IF _request_type = 'subscription' THEN
    IF _plan_id IS NULL THEN RAISE EXCEPTION 'plan_required'; END IF;
    SELECT price_mmk, role_scope INTO v_expected, v_scope
      FROM public.subscription_plans WHERE id = _plan_id AND is_active = true;
    IF v_expected IS NULL THEN RAISE EXCEPTION 'plan_not_found'; END IF;

    IF _mmk_amount <> v_expected THEN RAISE EXCEPTION 'amount_mismatch'; END IF;

    IF v_scope = 'employer' AND NOT v_is_employer THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    ELSIF v_scope = 'recruiting_agent' AND NOT v_is_agent THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    ELSIF v_scope = 'jobseeker' AND NOT v_is_jobseeker THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    ELSIF v_scope = 'mentor' AND NOT v_is_mentor THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    END IF;

    IF _payment_method = 'free_trial' AND v_expected <> 0 THEN
      RAISE EXCEPTION 'free_trial_not_allowed';
    END IF;
    IF v_expected = 0 AND _payment_method <> 'free_trial' THEN
      RAISE EXCEPTION 'invalid_method_for_free_plan';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.subscription_payment_requests
      WHERE user_id = v_user AND plan_id = _plan_id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'duplicate_pending_request';
    END IF;
  ELSE
    IF _addon_id IS NULL THEN RAISE EXCEPTION 'addon_required'; END IF;
    SELECT mmk, role_scope INTO v_expected, v_scope
      FROM public.addon_products WHERE id = _addon_id AND is_active = true;
    IF v_expected IS NULL THEN RAISE EXCEPTION 'addon_not_found'; END IF;
    IF _mmk_amount <> (v_expected * _quantity) THEN RAISE EXCEPTION 'amount_mismatch'; END IF;

    IF v_scope = 'employer' AND NOT v_is_employer THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    ELSIF v_scope = 'recruiting_agent' AND NOT v_is_agent THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    ELSIF v_scope = 'jobseeker' AND NOT v_is_jobseeker THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    ELSIF v_scope = 'mentor' AND NOT v_is_mentor THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.subscription_payment_requests
      WHERE user_id = v_user AND addon_id = _addon_id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'duplicate_pending_request';
    END IF;
  END IF;

  INSERT INTO public.subscription_payment_requests(
    user_id, request_type, plan_id, addon_id, quantity, mmk_amount,
    payment_method, proof_url, sender_reference, status
  ) VALUES (
    v_user, _request_type, _plan_id, _addon_id, _quantity, _mmk_amount,
    _payment_method, _proof_url, _sender_reference, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;
