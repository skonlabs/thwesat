
DO $$
DECLARE uid uuid := '77777777-7777-7777-7777-777777777777';
BEGIN
  DELETE FROM auth.users WHERE id = uid OR email = 'e2e.admin@thwesat.test';
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated','authenticated',
    'e2e.admin@thwesat.test', crypt('E2ePass#2026', gen_salt('bf')), now(),
    jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
    jsonb_build_object('display_name','E2E Admin','primary_role','admin'),
    now(), now(), '', '', '', ''
  );
  DELETE FROM public.user_roles WHERE user_id = uid;
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'admin');
END $$;
