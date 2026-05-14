
CREATE OR REPLACE FUNCTION public.is_partner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'partner'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_partner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role) OR public.has_role(_user_id, 'partner'::app_role);
$$;

REVOKE EXECUTE ON FUNCTION public.is_partner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_partner(uuid) FROM anon;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

DO $$ BEGIN CREATE POLICY "Partners can view all jobs" ON public.jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners can update jobs" ON public.jobs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read applications" ON public.applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read bookings" ON public.mentor_bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read employer profiles" ON public.employer_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners update employer profiles" ON public.employer_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners update mentor profiles" ON public.mentor_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read agent clients" ON public.agent_clients FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read posts" ON public.community_posts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners update posts" ON public.community_posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners update contact messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Partners read topup requests" ON public.topup_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.approve_job(_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job public.jobs%ROWTYPE; v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'moderator'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
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

CREATE OR REPLACE FUNCTION public.review_payment_request(_payment_id uuid, _new_status text, _admin_note text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pr public.payment_requests%ROWTYPE;
  v_caller uuid := auth.uid();
  v_now timestamptz := now();
  v_booking public.mentor_bookings%ROWTYPE;
  v_mentor_payout numeric;
  v_link_path text;
  v_note text := NULLIF(trim(coalesce(_admin_note,'')), '');
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized: only admins or partners can review payments';
  END IF;
  IF _new_status NOT IN ('approved','rejected','revoked') THEN
    RAISE EXCEPTION 'invalid_status: must be approved, rejected, or revoked';
  END IF;
  SELECT * INTO pr FROM public.payment_requests WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;
  IF pr.status = _new_status THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'status', pr.status);
  END IF;
  IF pr.status = 'revoked' THEN RAISE EXCEPTION 'invalid_transition: revoked is terminal'; END IF;
  IF _new_status = 'revoked' AND pr.status <> 'approved' THEN
    RAISE EXCEPTION 'invalid_transition: only approved payments can be revoked';
  END IF;

  v_link_path := CASE pr.payment_type
    WHEN 'placement_fee' THEN '/employer/finance'
    WHEN 'mentor_session' THEN '/mentors/bookings'
    ELSE '/finance'
  END;

  IF _new_status = 'approved' THEN
    IF pr.payment_type = 'mentor_session' AND pr.booking_id IS NOT NULL THEN
      SELECT * INTO v_booking FROM public.mentor_bookings WHERE id = pr.booking_id FOR UPDATE;
      IF FOUND THEN
        UPDATE public.mentor_bookings SET payment_status = 'paid' WHERE id = pr.booking_id;
        v_mentor_payout := round((pr.amount * 0.85)::numeric, 2);
        INSERT INTO public.mentor_earnings (mentor_id, booking_id, amount, currency, status)
        VALUES (v_booking.mentor_id, pr.booking_id, v_mentor_payout, pr.currency, 'pending');
      END IF;
    END IF;
    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (pr.user_id, 'payment',
      'Payment Approved', 'ငွေပေးချေမှု အတည်ပြုပြီးပါပြီ',
      'Your ' || pr.amount || ' ' || pr.currency || ' payment has been approved.',
      'သင့်ငွေပေးချေမှု ' || pr.amount || ' ' || pr.currency || ' ကို အတည်ပြုပြီးပါပြီ။',
      v_link_path);
  ELSIF _new_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (pr.user_id, 'payment',
      'Payment Rejected', 'ငွေပေးချေမှု ငြင်းပယ်ခံရပါသည်',
      COALESCE(v_note, 'Your payment was rejected. Please contact support.'),
      COALESCE(v_note, 'သင့်ငွေပေးချေမှုကို ငြင်းပယ်ခဲ့ပါသည်။ Support ကိုဆက်သွယ်ပါ။'),
      v_link_path);
  END IF;

  UPDATE public.payment_requests
     SET status = _new_status,
         admin_note = COALESCE(v_note, admin_note),
         reviewed_by = v_caller,
         reviewed_at = v_now,
         updated_at = v_now
   WHERE id = _payment_id;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'payment_'||_new_status, 'payment_request', _payment_id::text,
          jsonb_build_object('amount', pr.amount, 'currency', pr.currency, 'note', v_note));

  RETURN jsonb_build_object('ok', true, 'status', _new_status);
END $$;

CREATE OR REPLACE FUNCTION public.wallet_topup_approve(_topup_id uuid, _admin_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t public.topup_requests%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO t FROM public.topup_requests WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup_not_found'; END IF;
  IF t.status = 'approved' THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;
  IF t.status <> 'pending' THEN RAISE EXCEPTION 'invalid_transition'; END IF;

  UPDATE public.topup_requests
     SET status='approved', reviewed_by=v_caller, reviewed_at=now(), admin_note=COALESCE(_admin_note, admin_note)
   WHERE id=_topup_id;

  PERFORM public.wallet_topup_credit(_topup_id);

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'topup_approved', 'topup_request', _topup_id::text, jsonb_build_object('amount_mmk', t.amount_mmk));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.wallet_topup_reject(_topup_id uuid, _admin_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t public.topup_requests%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO t FROM public.topup_requests WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup_not_found'; END IF;
  IF t.status = 'rejected' THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;
  IF t.status <> 'pending' THEN RAISE EXCEPTION 'invalid_transition'; END IF;

  UPDATE public.topup_requests
     SET status='rejected', reviewed_by=v_caller, reviewed_at=now(), admin_note=COALESCE(_admin_note, admin_note)
   WHERE id=_topup_id;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'topup_rejected', 'topup_request', _topup_id::text, jsonb_build_object('amount_mmk', t.amount_mmk));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.set_user_suspended(_user_id uuid, _suspended boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'invalid_user'; END IF;
  IF public.has_role(_user_id,'admin'::app_role) THEN
    RAISE EXCEPTION 'cannot_suspend_admin';
  END IF;
  UPDATE public.profiles SET is_suspended = _suspended, updated_at = now() WHERE id = _user_id;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, CASE WHEN _suspended THEN 'user_suspended' ELSE 'user_unsuspended' END,
          'user', _user_id::text, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true, 'is_suspended', _suspended);
END $$;

REVOKE EXECUTE ON FUNCTION public.set_user_suspended(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_suspended(uuid, boolean) TO authenticated;
