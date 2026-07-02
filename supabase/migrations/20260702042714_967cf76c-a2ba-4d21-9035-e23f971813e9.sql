
DO $$
DECLARE
  users jsonb := jsonb_build_array(
    jsonb_build_object('email','e2e.seeker@thwesat.test','role','job_seeker','id','22222222-2222-2222-2222-222222222222','name','E2E Seeker'),
    jsonb_build_object('email','e2e.employer@thwesat.test','role','employer','id','33333333-3333-3333-3333-333333333333','name','E2E Employer'),
    jsonb_build_object('email','e2e.agent@thwesat.test','role','agent','id','44444444-4444-4444-4444-444444444444','name','E2E Agent'),
    jsonb_build_object('email','e2e.mentor@thwesat.test','role','mentor','id','55555555-5555-5555-5555-555555555555','name','E2E Mentor'),
    jsonb_build_object('email','e2e.partner@thwesat.test','role','partner','id','66666666-6666-6666-6666-666666666666','name','E2E Partner')
  );
  rec jsonb; uid uuid; em text; rl text; nm text;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(users) LOOP
    uid := (rec->>'id')::uuid; em := rec->>'email'; rl := rec->>'role'; nm := rec->>'name';
    DELETE FROM auth.users WHERE id = uid OR email = em;
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      em, crypt('E2ePass#2026', gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      jsonb_build_object('display_name', nm, 'primary_role', rl),
      now(), now(), '', '', '', ''
    );
    DELETE FROM public.user_roles WHERE user_id = uid;
    INSERT INTO public.user_roles(user_id, role) VALUES (uid, rl::app_role);
  END LOOP;
  UPDATE public.employer_profiles SET verification_status='verified'
    WHERE id IN ('33333333-3333-3333-3333-333333333333'::uuid, '44444444-4444-4444-4444-444444444444'::uuid);
END $$;
