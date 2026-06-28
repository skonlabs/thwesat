
DROP TRIGGER IF EXISTS trg_set_notification_created_by ON public.notifications;
DROP FUNCTION IF EXISTS public.set_notification_created_by() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_role public.app_role;
BEGIN
  BEGIN
    v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'primary_role',''),'job_seeker')::public.app_role;
  EXCEPTION WHEN others THEN v_role := 'job_seeker'::public.app_role;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, v_role);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.try_grant_signup_bonus(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_bonus bigint := 1000;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_transactions WHERE user_id=_user_id AND ref_type='signup_bonus') THEN RETURN false; END IF;
  IF NOT (public.has_role(_user_id,'job_seeker'::public.app_role) OR public.has_role(_user_id,'mentor'::public.app_role)) THEN RETURN false; END IF;
  INSERT INTO public.wallets(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallet_transactions(user_id, kind, credits, mmk_amount, status, ref_type, ref_id, idempotency_key)
  VALUES (_user_id,'topup',v_bonus,v_bonus,'completed','signup_bonus',_user_id::text,'signup_bonus:'||_user_id::text);
  PERFORM public._wallet_apply(_user_id, v_bonus, v_bonus);
  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (_user_id,'payment','🎁 Welcome bonus: 1,000 Ks','🎁 ကြိုဆိုဆုကြေး: 1,000 Ks',
    '1,000 Ks added to your wallet. Enjoy!','သင့်ပိုက်ဆံအိတ်ထဲ 1,000 Ks ထည့်ပေးပြီးပါပြီ။','/wallet');
  RETURN true;
END $$;

DO $$
DECLARE
  v_admin uuid := '11111111-1111-1111-1111-111111111111';
  v_agent uuid := '22222222-2222-2222-2222-222222222222';
  v_seeker uuid := '33333333-3333-3333-3333-333333333333';
  v_emp uuid := '44444444-4444-4444-4444-444444444444';
  v_pw text := crypt('test@123', gen_salt('bf'));
BEGIN
  DELETE FROM auth.users WHERE id IN (v_admin, v_agent, v_seeker, v_emp);

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_admin,'authenticated','authenticated','test@test.com',v_pw,now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     jsonb_build_object('display_name','Admin Tester','primary_role','admin'), now(),now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000', v_agent,'authenticated','authenticated','another-agent3@test.com',v_pw,now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     jsonb_build_object('display_name','Agent Tester','primary_role','agent'), now(),now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000', v_seeker,'authenticated','authenticated','test-jobseeker@test.com',v_pw,now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     jsonb_build_object('display_name','Seeker Tester','primary_role','job_seeker'), now(),now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000', v_emp,'authenticated','authenticated','test-employer@test.com',v_pw,now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     jsonb_build_object('display_name','Employer Tester','primary_role','employer'), now(),now(),'','','','');

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_admin,  jsonb_build_object('sub',v_admin::text, 'email','test@test.com'),           'email','test@test.com',           now(),now(),now()),
    (gen_random_uuid(), v_agent,  jsonb_build_object('sub',v_agent::text, 'email','another-agent3@test.com'), 'email','another-agent3@test.com', now(),now(),now()),
    (gen_random_uuid(), v_seeker, jsonb_build_object('sub',v_seeker::text,'email','test-jobseeker@test.com'), 'email','test-jobseeker@test.com', now(),now(),now()),
    (gen_random_uuid(), v_emp,    jsonb_build_object('sub',v_emp::text,   'email','test-employer@test.com'),  'email','test-employer@test.com',  now(),now(),now());

  DELETE FROM public.user_roles WHERE user_id IN (v_admin, v_agent, v_seeker, v_emp);
  INSERT INTO public.user_roles (user_id, role) VALUES
    (v_admin,'admin'),(v_agent,'agent'),(v_seeker,'job_seeker'),(v_emp,'employer');

  INSERT INTO public.admin_profiles (user_id, display_name) VALUES (v_admin,'Admin Tester') ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.agent_profiles (user_id, display_name) VALUES (v_agent,'Agent Tester') ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.jobseeker_profiles (user_id, display_name) VALUES (v_seeker,'Seeker Tester') ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.mentor_profiles (id, display_name) VALUES (v_seeker,'Seeker Tester') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.employer_profiles (id, display_name, verification_status) VALUES (v_emp,'Employer Tester','verified')
    ON CONFLICT (id) DO UPDATE SET verification_status='verified';
  INSERT INTO public.employer_profiles (id, display_name, verification_status) VALUES (v_agent,'Agent Tester','verified')
    ON CONFLICT (id) DO UPDATE SET verification_status='verified';
END $$;
