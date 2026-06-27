
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role public.app_role)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller,'admin'::public.app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller,'set_user_role','user',_user_id::text, jsonb_build_object('role',_role));
  RETURN jsonb_build_object('ok',true,'role',_role);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;

-- One-time self role assignment: only allowed if user currently has no role.
CREATE OR REPLACE FUNCTION public.assign_my_role(_role public.app_role)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _role = 'admin' OR _role = 'partner' THEN RAISE EXCEPTION 'role_not_self_assignable'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'role_already_assigned';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, _role);
  RETURN jsonb_build_object('ok',true,'role',_role);
END $$;
GRANT EXECUTE ON FUNCTION public.assign_my_role(public.app_role) TO authenticated;

-- Allow a job_seeker to upgrade themselves to mentor (BecomeMentor flow).
CREATE OR REPLACE FUNCTION public.become_mentor()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  -- Employers/agents keep their role and just get a mentor_profile elsewhere.
  IF public.has_role(v_uid,'employer'::public.app_role) OR public.has_role(v_uid,'agent'::public.app_role) THEN
    RETURN jsonb_build_object('ok',true,'role_changed',false);
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid,'mentor')
  ON CONFLICT (user_id) DO UPDATE SET role = 'mentor';
  RETURN jsonb_build_object('ok',true,'role_changed',true);
END $$;
GRANT EXECUTE ON FUNCTION public.become_mentor() TO authenticated;
