
-- A2 — approve_job(_job_id) RPC
CREATE OR REPLACE FUNCTION public.approve_job(_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job public.jobs%ROWTYPE; v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'moderator'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_not_found'; END IF;
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

-- A7 — Re-moderation trigger for sensitive job edits by unverified employers.
CREATE OR REPLACE FUNCTION public.jobs_resubmit_on_sensitive_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_employer_verified boolean; v_caller uuid := auth.uid();
BEGIN
  IF public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'moderator'::app_role) THEN RETURN NEW; END IF;
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
DROP TRIGGER IF EXISTS trg_jobs_resubmit_on_sensitive_edit ON public.jobs;
CREATE TRIGGER trg_jobs_resubmit_on_sensitive_edit
BEFORE UPDATE ON public.jobs FOR EACH ROW
EXECUTE FUNCTION public.jobs_resubmit_on_sensitive_edit();

-- A9 — Block applications to non-active jobs.
CREATE OR REPLACE FUNCTION public.applications_require_active_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.jobs WHERE id = NEW.job_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'job_not_active' USING HINT='This job is no longer accepting applications.'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_applications_require_active_job ON public.applications;
CREATE TRIGGER trg_applications_require_active_job
BEFORE INSERT ON public.applications FOR EACH ROW
EXECUTE FUNCTION public.applications_require_active_job();

-- B3 — mentor_session_refund: mentee can also call; sets booking cancelled.
CREATE OR REPLACE FUNCTION public.mentor_session_refund(_booking_id uuid, _reason text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.mentor_session_escrow%ROWTYPE; b public.mentor_bookings%ROWTYPE;
        v_caller uuid := auth.uid(); v_tx uuid;
BEGIN
  SELECT * INTO b FROM public.mentor_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF NOT (v_caller = b.mentor_id OR v_caller = b.mentee_id OR public.has_role(v_caller,'admin'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO e FROM public.mentor_session_escrow WHERE booking_id = _booking_id FOR UPDATE;
  IF FOUND AND e.status = 'held' THEN
    INSERT INTO public.wallet_transactions(user_id,kind,credits,status,ref_type,ref_id,note,created_by)
    VALUES (e.mentee_id,'refund',e.credits_held,'completed','booking',_booking_id::text,COALESCE(_reason,'Session refunded'),v_caller)
    RETURNING id INTO v_tx;
    PERFORM public._wallet_apply(e.mentee_id, e.credits_held, 0);
    UPDATE public.mentor_session_escrow SET status='refunded', refund_tx_id=v_tx, resolved_at=now() WHERE booking_id=_booking_id;
    UPDATE public.mentor_bookings SET payment_status='refunded', status='cancelled', decline_reason=COALESCE(_reason,decline_reason), updated_at=now() WHERE id=_booking_id;
  ELSE
    UPDATE public.mentor_bookings SET status='cancelled', decline_reason=COALESCE(_reason,decline_reason), updated_at=now() WHERE id=_booking_id;
  END IF;
  RETURN jsonb_build_object('ok',true,'refund_tx',v_tx);
END $$;

-- B6 — Free availability slot when booking is cancelled/rejected/declined.
CREATE OR REPLACE FUNCTION public.free_slot_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('cancelled','rejected','declined') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.mentor_availability_slots
    SET is_booked = false, updated_at = now()
    WHERE mentor_id = NEW.mentor_id
      AND start_time = NEW.scheduled_time
      AND (slot_date::text = NEW.scheduled_date
           OR day_of_week = to_char((NEW.scheduled_date)::date,'FMDay'));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_free_slot_on_cancel ON public.mentor_bookings;
CREATE TRIGGER trg_free_slot_on_cancel
AFTER UPDATE ON public.mentor_bookings FOR EACH ROW
EXECUTE FUNCTION public.free_slot_on_cancel();

-- B7 — Mentor reviews uniqueness + completed-only RLS.
CREATE UNIQUE INDEX IF NOT EXISTS mentor_reviews_unique_per_booking
ON public.mentor_reviews(booking_id, reviewer_id) WHERE booking_id IS NOT NULL;
DROP POLICY IF EXISTS "Users can create reviews after a booking" ON public.mentor_reviews;
DROP POLICY IF EXISTS "Users can create reviews after completed booking" ON public.mentor_reviews;
CREATE POLICY "Users can create reviews after completed booking"
ON public.mentor_reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (SELECT 1 FROM public.mentor_bookings b
              WHERE b.id = mentor_reviews.booking_id
                AND b.mentor_id = mentor_reviews.mentor_id
                AND b.mentee_id = auth.uid()
                AND b.status = 'completed')
);

-- C2 — wallet_spend: require idempotency_key (DROP first to change defaults).
DROP FUNCTION IF EXISTS public.wallet_spend(text,text,text,text,jsonb);
CREATE FUNCTION public.wallet_spend(
  _action_key text, _target_type text, _target_id text,
  _idempotency_key text, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  SELECT price_credits INTO v_price FROM public.action_prices WHERE action_key=_action_key AND is_active=true;
  IF v_price IS NULL THEN RAISE EXCEPTION 'price_not_found' USING HINT=_action_key; END IF;
  INSERT INTO public.wallet_transactions(user_id,kind,credits,status,ref_type,ref_id,note,idempotency_key,metadata,created_by)
  VALUES (v_user,'spend',-v_price,'completed',_target_type,_target_id,_action_key,_idempotency_key,_metadata,v_user)
  RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(v_user, -v_price, 0);
  RETURN jsonb_build_object('ok',true,'transaction_id',v_tx,'credits_spent',v_price);
END $$;

-- D5 — Audit user_roles changes.
CREATE OR REPLACE FUNCTION public.audit_user_roles_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
    VALUES (COALESCE(auth.uid(), NEW.user_id),'role_granted','user',NEW.user_id::text, jsonb_build_object('role',NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
    VALUES (COALESCE(auth.uid(), OLD.user_id),'role_revoked','user',OLD.user_id::text, jsonb_build_object('role',OLD.role));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW
EXECUTE FUNCTION public.audit_user_roles_change();

-- E3 — Restrict direct INSERTs into mentor_earnings to admins.
DROP POLICY IF EXISTS "Admins can insert earnings" ON public.mentor_earnings;
CREATE POLICY "Admins can insert earnings"
ON public.mentor_earnings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- C6 — Validate payment_requests.currency.
CREATE OR REPLACE FUNCTION public.validate_payment_request_currency()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.currency IS NULL OR NEW.currency NOT IN ('MMK','USD','SGD','THB') THEN
    RAISE EXCEPTION 'unsupported_currency: %', NEW.currency;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_payment_request_currency ON public.payment_requests;
CREATE TRIGGER trg_validate_payment_request_currency
BEFORE INSERT OR UPDATE OF currency ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_request_currency();
