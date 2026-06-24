
-- reject_job: audited, atomic, mirrors approve_job structure
CREATE OR REPLACE FUNCTION public.reject_job(_job_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job public.jobs%ROWTYPE; v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_not_found'; END IF;
  UPDATE public.jobs SET status='rejected', rejection_reason = _reason, updated_at = now() WHERE id = _job_id;
  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (v_job.employer_id, 'job_rejected',
    format('Your job "%s" was rejected', v_job.title),
    format('"%s" အလုပ်ကြော်ငြာ ငြင်းပယ်ခံရပြီ', COALESCE(v_job.title_my, v_job.title)),
    COALESCE(_reason, 'Your job listing did not meet our guidelines.'),
    COALESCE(_reason, 'သင့်အလုပ်ကြော်ငြာသည် လမ်းညွှန်ချက်များနှင့် ကိုက်ညီမှု မရှိပါ။'),
    '/employer/dashboard');
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'job_rejected', 'job', _job_id::text,
          jsonb_build_object('title', v_job.title, 'reason', _reason));
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.reject_job(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reject_job(uuid, text) TO authenticated;

-- delete_job: admin-only, audited
CREATE OR REPLACE FUNCTION public.delete_job(_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job public.jobs%ROWTYPE; v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller,'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_not_found'; END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'job_deleted', 'job', _job_id::text,
          jsonb_build_object('title', v_job.title, 'employer_id', v_job.employer_id, 'status', v_job.status));
  DELETE FROM public.jobs WHERE id = _job_id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.delete_job(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_job(uuid) TO authenticated;

-- admin_verify_employer: audited verify/reject; only flips is_verified for employer role (not agent)
CREATE OR REPLACE FUNCTION public.admin_verify_employer(_employer_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_primary_role text;
  v_is_verified boolean;
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _status NOT IN ('verified','approved','rejected','pending') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  SELECT primary_role INTO v_primary_role FROM public.profiles WHERE id = _employer_id;

  -- Only flip is_verified for the employer role; agents shouldn't be marked as a verified employer.
  v_is_verified := (_status IN ('verified','approved')) AND COALESCE(v_primary_role, 'employer') = 'employer';

  UPDATE public.employer_profiles
     SET verification_status = _status,
         is_verified = v_is_verified,
         updated_at = now()
   WHERE id = _employer_id;

  IF _status IN ('verified','approved') THEN
    BEGIN
      PERFORM public.admin_confirm_user_email(_employer_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (_employer_id, 'system',
    CASE WHEN v_is_verified OR _status IN ('verified','approved')
         THEN 'Your account is verified! ✅'
         ELSE 'Verification update' END,
    CASE WHEN v_is_verified OR _status IN ('verified','approved')
         THEN 'သင့်အကောင့် အတည်ပြုပြီ! ✅'
         ELSE 'အတည်ပြုမှု အခြေအနေ' END,
    CASE WHEN _status IN ('verified','approved')
         THEN 'You can now post jobs and manage applications.'
         ELSE COALESCE(_reason, 'Your profile was not approved.') END,
    CASE WHEN _status IN ('verified','approved')
         THEN 'အလုပ်များ တင်ပြီး လျှောက်လွှာများ စီမံနိုင်ပါပြီ။'
         ELSE COALESCE(_reason, 'သင့်ပရိုဖိုင် အတည်ပြုခြင်း မရှိပါ။') END,
    CASE WHEN v_primary_role = 'agent' THEN '/agent/dashboard' ELSE '/employer/dashboard' END);

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'employer_'||_status, 'employer_profile', _employer_id::text,
          jsonb_build_object('reason', _reason, 'role', v_primary_role));

  RETURN jsonb_build_object('ok', true, 'status', _status, 'is_verified', v_is_verified);
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_verify_employer(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_verify_employer(uuid, text, text) TO authenticated;
