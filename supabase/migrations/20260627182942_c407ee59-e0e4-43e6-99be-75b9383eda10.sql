
-- 1) Sanitize all functions still referencing the retired 'moderator' app_role.
CREATE OR REPLACE FUNCTION public.get_user_contacts_admin(_ids uuid[])
RETURNS TABLE(id uuid, email text, phone text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.phone
    FROM public.v_profiles p
    WHERE p.id = ANY(_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'partner')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_notify(_target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    auth.uid() = _target_user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'partner'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid() AND cp2.user_id = _target_user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE (a.applicant_id = auth.uid() AND j.employer_id = _target_user_id)
         OR (a.applicant_id = _target_user_id AND j.employer_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.mentor_bookings b
      WHERE (b.mentor_id = auth.uid() AND b.mentee_id = _target_user_id)
         OR (b.mentor_id = _target_user_id AND b.mentee_id = auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.jobs_lock_ownership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.employer_id IS DISTINCT FROM OLD.employer_id
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'employer_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.jobs_resubmit_on_sensitive_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_employer_verified boolean; v_caller uuid := auth.uid();
BEGIN
  IF public.has_role(v_caller,'admin'::app_role) THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT COALESCE(is_verified,false) INTO v_employer_verified FROM public.employer_profiles WHERE id = NEW.employer_id;
  IF v_employer_verified THEN RETURN NEW; END IF;
  IF (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.description IS DISTINCT FROM OLD.description)
     OR (NEW.requirements IS DISTINCT FROM OLD.requirements)
     OR (NEW.external_url IS DISTINCT FROM OLD.external_url)
     OR (NEW.application_method IS DISTINCT FROM OLD.application_method)
     OR (NEW.salary_min IS DISTINCT FROM OLD.salary_min)
     OR (NEW.salary_max IS DISTINCT FROM OLD.salary_max) THEN
    NEW.status := 'pending'; NEW.is_verified := false;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.approve_job(_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_job public.jobs%ROWTYPE; v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF v_job.expires_at IS NOT NULL AND v_job.expires_at <= now() THEN
    RAISE EXCEPTION 'job_expired';
  END IF;
  UPDATE public.jobs SET status='active', is_verified=true, updated_at=now() WHERE id = _job_id;
  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (v_job.employer_id,'job',
    'Your job listing is live','သင့်အလုပ်ကြော်ငြာ စတင်ပြသပြီးပါပြီ',
    format('"%s" has been approved and is now visible to candidates.', v_job.title),
    format('"%s" အတည်ပြုပြီး လူကြည့်နိုင်ပါပြီ။', COALESCE(v_job.title_my, v_job.title)),
    '/employer/dashboard');
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'job_approved', 'job', _job_id::text, jsonb_build_object('title', v_job.title));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.applications_restrict_applicant_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.applicant_id THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN RETURN NEW; END IF;
  IF NEW.rejection_reason     IS DISTINCT FROM OLD.rejection_reason     THEN NEW.rejection_reason     := OLD.rejection_reason;     END IF;
  IF NEW.rejection_reason_my  IS DISTINCT FROM OLD.rejection_reason_my  THEN NEW.rejection_reason_my  := OLD.rejection_reason_my;  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'withdrawn' THEN NULL;
    ELSIF NEW.status = 'declined' AND OLD.status IN ('offered') THEN NULL;
    ELSIF NEW.status = 'applied' AND OLD.status IN ('withdrawn','rejected','declined') THEN NULL;
    ELSE RAISE EXCEPTION 'applicant_cannot_set_status_%', NEW.status USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mentor_bookings_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_caller uuid := auth.uid(); v_is_admin boolean;
BEGIN
  IF v_caller IS NULL THEN RETURN NEW; END IF;
  v_is_admin := public.has_role(v_caller,'admin'::app_role);
  IF v_is_admin THEN RETURN NEW; END IF;
  IF NEW.mentor_id IS DISTINCT FROM OLD.mentor_id
     OR NEW.mentee_id IS DISTINCT FROM OLD.mentee_id
     OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
     OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time
     OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
     OR NEW.credits_charged IS DISTINCT FROM OLD.credits_charged
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'forbidden_column_update' USING HINT='These fields cannot be changed after a booking is created.';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_caller = OLD.mentee_id AND v_caller <> OLD.mentor_id THEN
      IF NEW.status NOT IN ('cancelled') THEN
        RAISE EXCEPTION 'mentee_can_only_cancel';
      END IF;
    ELSIF v_caller = OLD.mentor_id THEN
      IF NEW.status NOT IN ('pending','confirmed','completed','cancelled','declined') THEN
        RAISE EXCEPTION 'invalid_status_transition';
      END IF;
    ELSE RAISE EXCEPTION 'not_authorized_status_change';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- admin_attribute_user references removed tables (partners, profiles); drop it.
DROP FUNCTION IF EXISTS public.admin_attribute_user(uuid, uuid, text);

-- 2) Backfill resume_id from cv_document_id, then drop the legacy column.
UPDATE public.applications
   SET resume_id = cv_document_id
 WHERE resume_id IS NULL AND cv_document_id IS NOT NULL;

ALTER TABLE public.applications DROP COLUMN IF EXISTS cv_document_id;

-- 3) Update the employer column whitelist to use current columns.
CREATE OR REPLACE FUNCTION public.applications_employer_column_whitelist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.applicant_id = auth.uid() THEN RETURN NEW; END IF;
  IF NEW.applicant_id IS DISTINCT FROM OLD.applicant_id
     OR NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.resume_id IS DISTINCT FROM OLD.resume_id
     OR NEW.cover_letter_id IS DISTINCT FROM OLD.cover_letter_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'forbidden_column_update' USING HINT='Employers cannot change applicant/job/resume/cover letter on an application.';
  END IF;
  RETURN NEW;
END;
$$;
