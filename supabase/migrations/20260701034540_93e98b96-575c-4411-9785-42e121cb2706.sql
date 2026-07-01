
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

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='admin'::app_role) INTO v_is_admin_now;

  -- Block changing an admin's role to anything other than admin
  IF v_is_admin_now AND _role <> 'admin'::app_role THEN
    RAISE EXCEPTION 'admin_role_locked' USING MESSAGE = 'Cannot change role of an admin user.';
  END IF;

  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller,'set_user_role','user',_user_id::text, jsonb_build_object('role',_role));
  RETURN jsonb_build_object('ok',true,'role',_role);
END $function$;
