
DROP VIEW IF EXISTS public.employer_profiles_public;

CREATE OR REPLACE FUNCTION public.sync_slot_booked_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_active_states text[] := ARRAY['pending','confirmed'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = ANY(v_active_states) THEN
      UPDATE public.mentor_availability_slots
        SET is_booked = true, updated_at = now()
      WHERE mentor_id = NEW.mentor_id
        AND slot_date::text = NEW.scheduled_date
        AND start_time = NEW.scheduled_time;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status = ANY(v_active_states)) AND NOT (NEW.status = ANY(v_active_states)) THEN
      UPDATE public.mentor_availability_slots
        SET is_booked = false, updated_at = now()
      WHERE mentor_id = OLD.mentor_id
        AND slot_date::text = OLD.scheduled_date
        AND start_time = OLD.scheduled_time
        AND NOT EXISTS (
          SELECT 1 FROM public.mentor_bookings b2
          WHERE b2.mentor_id = OLD.mentor_id
            AND b2.scheduled_date = OLD.scheduled_date
            AND b2.scheduled_time = OLD.scheduled_time
            AND b2.id <> OLD.id
            AND b2.status = ANY(v_active_states)
        );
    ELSIF NOT (OLD.status = ANY(v_active_states)) AND (NEW.status = ANY(v_active_states)) THEN
      UPDATE public.mentor_availability_slots
        SET is_booked = true, updated_at = now()
      WHERE mentor_id = NEW.mentor_id
        AND slot_date::text = NEW.scheduled_date
        AND start_time = NEW.scheduled_time;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END; $$;

DELETE FROM public.applications a
WHERE NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id);
DELETE FROM public.saved_jobs s
WHERE NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = s.job_id);

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_job_id_fkey;
ALTER TABLE public.applications ADD CONSTRAINT applications_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.saved_jobs DROP CONSTRAINT IF EXISTS saved_jobs_job_id_fkey;
ALTER TABLE public.saved_jobs ADD CONSTRAINT saved_jobs_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY mentor_id, scheduled_date, scheduled_time ORDER BY created_at ASC
  ) AS rn
  FROM public.mentor_bookings WHERE status IN ('pending','confirmed')
)
UPDATE public.mentor_bookings b
   SET status = 'cancelled',
       decline_reason = COALESCE(decline_reason, 'Auto-cancelled duplicate (Phase 1 cleanup)'),
       updated_at = now()
  FROM ranked r WHERE r.id = b.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS mentor_bookings_unique_active_slot
  ON public.mentor_bookings (mentor_id, scheduled_date, scheduled_time)
  WHERE status IN ('pending','confirmed');

CREATE OR REPLACE FUNCTION public.accept_counter_proposal(_booking_id uuid)
RETURNS public.mentor_bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.mentor_bookings;
BEGIN
  SELECT * INTO _row FROM public.mentor_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF auth.uid() <> _row.mentee_id AND auth.uid() <> _row.mentor_id THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  IF _row.proposed_date IS NULL OR _row.proposed_time IS NULL THEN
    RAISE EXCEPTION 'No counter-proposal pending'; END IF;
  UPDATE public.mentor_bookings
     SET scheduled_date = _row.proposed_date, scheduled_time = _row.proposed_time,
         proposed_date = NULL, proposed_time = NULL,
         status = 'confirmed', updated_at = now()
   WHERE id = _booking_id RETURNING * INTO _row;
  RETURN _row;
END; $$;
GRANT EXECUTE ON FUNCTION public.accept_counter_proposal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_employer(_employer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  DELETE FROM public.jobs WHERE employer_id = _employer_id;
  DELETE FROM public.notifications WHERE user_id = _employer_id;
  DELETE FROM public.payment_requests WHERE user_id = _employer_id;
  DELETE FROM public.employer_profiles WHERE id = _employer_id;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'delete_employer', 'employer', _employer_id::text, '{}'::jsonb);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_delete_employer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_user_cascade(_target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  DELETE FROM public.post_likes      WHERE user_id   = _target_user_id;
  DELETE FROM public.post_saves      WHERE user_id   = _target_user_id;
  DELETE FROM public.post_comments   WHERE author_id = _target_user_id;
  DELETE FROM public.community_posts WHERE author_id = _target_user_id;
  DELETE FROM public.saved_jobs    WHERE user_id      = _target_user_id;
  DELETE FROM public.applications  WHERE applicant_id = _target_user_id;
  DELETE FROM public.jobs          WHERE employer_id  = _target_user_id;
  DELETE FROM public.mentor_session_escrow     WHERE mentor_id = _target_user_id OR mentee_id = _target_user_id;
  DELETE FROM public.mentor_earnings           WHERE mentor_id = _target_user_id;
  DELETE FROM public.mentor_reviews            WHERE reviewer_id = _target_user_id OR mentor_id = _target_user_id;
  DELETE FROM public.mentor_bookings           WHERE mentor_id = _target_user_id OR mentee_id = _target_user_id;
  DELETE FROM public.mentor_mentees            WHERE mentor_id = _target_user_id OR mentee_id = _target_user_id;
  DELETE FROM public.mentor_availability_slots WHERE mentor_id = _target_user_id;
  DELETE FROM public.mentor_profiles           WHERE id = _target_user_id;
  DELETE FROM public.employer_profiles WHERE id = _target_user_id;
  DELETE FROM public.agent_clients     WHERE agent_id = _target_user_id;
  DELETE FROM public.cv_documents        WHERE user_id = _target_user_id;
  DELETE FROM public.generated_documents WHERE user_id = _target_user_id;
  DELETE FROM public.delegate_tokens     WHERE owner_id = _target_user_id;
  DELETE FROM public.guide_feedback      WHERE user_id = _target_user_id;
  DELETE FROM public.messages WHERE conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = _target_user_id
  );
  DELETE FROM public.conversation_participants WHERE user_id = _target_user_id;
  DELETE FROM public.conversations WHERE id NOT IN (
    SELECT DISTINCT conversation_id FROM public.conversation_participants
  );
  DELETE FROM public.notifications      WHERE user_id = _target_user_id OR created_by_user_id = _target_user_id;
  DELETE FROM public.payment_requests   WHERE user_id = _target_user_id;
  DELETE FROM public.feature_unlocks    WHERE user_id = _target_user_id;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  DELETE FROM public.profiles   WHERE id = _target_user_id;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'delete_user_cascade', 'user', _target_user_id::text, '{}'::jsonb);
END; $$;
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated can view employer profiles" ON public.employer_profiles;
DROP POLICY IF EXISTS "Restricted employer profile read" ON public.employer_profiles;

CREATE VIEW public.employer_profiles_public WITH (security_invoker = on) AS
SELECT id, company_name, company_description, company_website, company_linkedin,
       company_size, industry, hq_country, logo_url, cover_url, benefits,
       what_we_do, mission, vision, payment_methods, is_verified,
       verification_status, created_at, updated_at
FROM public.employer_profiles;

GRANT SELECT ON public.employer_profiles_public TO authenticated, anon;

CREATE POLICY "Restricted employer profile read"
ON public.employer_profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE j.employer_id = employer_profiles.id
      AND a.applicant_id = auth.uid()
  )
);
