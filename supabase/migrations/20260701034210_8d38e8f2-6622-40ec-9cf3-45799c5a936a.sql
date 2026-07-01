
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_admin_count int;
  v_is_admin_now boolean;
BEGIN
  IF NOT public.has_role(v_caller,'admin'::public.app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  -- Guard: don't allow demoting the last admin
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='admin'::app_role) INTO v_is_admin_now;
  IF v_is_admin_now AND _role <> 'admin'::app_role THEN
    SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role='admin'::app_role;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'last_admin_protected' USING MESSAGE = 'Cannot remove the last admin. Assign another admin first.';
    END IF;
  END IF;

  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller,'set_user_role','user',_user_id::text, jsonb_build_object('role',_role));
  RETURN jsonb_build_object('ok',true,'role',_role);
END $function$;

CREATE OR REPLACE FUNCTION public.delete_user_cascade(_target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_count int;
  v_is_admin boolean;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;

  -- Guard: don't allow deleting the last admin
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target_user_id AND role='admin'::app_role) INTO v_is_admin;
  IF v_is_admin THEN
    SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role='admin'::app_role;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'last_admin_protected' USING MESSAGE = 'Cannot remove the last admin. Assign another admin first.';
    END IF;
  END IF;

  DELETE FROM public.post_likes        WHERE user_id=_target_user_id;
  DELETE FROM public.post_saves        WHERE user_id=_target_user_id;
  DELETE FROM public.post_comments     WHERE author_id=_target_user_id;
  DELETE FROM public.community_posts   WHERE author_id=_target_user_id;
  DELETE FROM public.saved_jobs        WHERE user_id=_target_user_id;
  DELETE FROM public.applications      WHERE applicant_id=_target_user_id;
  DELETE FROM public.jobs              WHERE employer_id=_target_user_id;
  DELETE FROM public.mentor_earnings           WHERE mentor_id=_target_user_id;
  DELETE FROM public.mentor_reviews            WHERE reviewer_id=_target_user_id OR mentor_id=_target_user_id;
  DELETE FROM public.mentor_bookings           WHERE mentor_id=_target_user_id OR mentee_id=_target_user_id;
  DELETE FROM public.mentor_mentees            WHERE mentor_id=_target_user_id OR mentee_id=_target_user_id;
  DELETE FROM public.mentor_availability_slots WHERE mentor_id=_target_user_id;
  DELETE FROM public.mentor_profiles           WHERE id=_target_user_id;
  DELETE FROM public.employer_profiles WHERE id=_target_user_id;
  DELETE FROM public.agent_profiles    WHERE user_id=_target_user_id;
  DELETE FROM public.jobseeker_profiles WHERE user_id=_target_user_id;
  DELETE FROM public.admin_profiles    WHERE user_id=_target_user_id;
  DELETE FROM public.partner_profiles  WHERE user_id=_target_user_id;
  DELETE FROM public.user_documents      WHERE user_id=_target_user_id;
  DELETE FROM public.generated_documents WHERE user_id=_target_user_id;
  DELETE FROM public.guide_feedback    WHERE user_id=_target_user_id;
  DELETE FROM public.messages WHERE conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id=_target_user_id);
  DELETE FROM public.conversation_participants WHERE user_id=_target_user_id;
  DELETE FROM public.conversations WHERE id NOT IN (SELECT DISTINCT conversation_id FROM public.conversation_participants);
  DELETE FROM public.notifications     WHERE user_id=_target_user_id;
  DELETE FROM public.topup_requests    WHERE user_id=_target_user_id;
  DELETE FROM public.subscription_payment_requests WHERE user_id=_target_user_id;
  DELETE FROM public.wallet_transactions WHERE user_id=_target_user_id;
  DELETE FROM public.wallets           WHERE user_id=_target_user_id;
  DELETE FROM public.feature_unlocks   WHERE user_id=_target_user_id;
  DELETE FROM public.user_account_state WHERE user_id=_target_user_id;
  DELETE FROM public.user_settings     WHERE user_id=_target_user_id;
  DELETE FROM public.user_roles        WHERE user_id=_target_user_id;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,details)
  VALUES (auth.uid(),'delete_user_cascade','user',_target_user_id::text,'{}'::jsonb);
END; $function$;
