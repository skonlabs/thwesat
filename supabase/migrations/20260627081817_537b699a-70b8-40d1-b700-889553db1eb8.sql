
-- 0) Drop legacy triggers that depend on profiles.primary_role
DROP TRIGGER IF EXISTS trg_ensure_employer_profile_on_role ON public.profiles;
DROP TRIGGER IF EXISTS trg_profile_signup_bonus ON public.profiles;

-- 1) Backfill
DELETE FROM public.user_roles WHERE role = 'user';
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, CASE p.primary_role
  WHEN 'jobseeker' THEN 'job_seeker'::public.app_role
  WHEN 'job_seeker' THEN 'job_seeker'::public.app_role
  WHEN 'agent' THEN 'agent'::public.app_role
  WHEN 'employer' THEN 'employer'::public.app_role
  WHEN 'mentor' THEN 'mentor'::public.app_role
  WHEN 'partner' THEN 'partner'::public.app_role
  WHEN 'admin' THEN 'admin'::public.app_role
  WHEN 'administrator' THEN 'admin'::public.app_role END
FROM public.profiles p
WHERE p.primary_role IN ('jobseeker','job_seeker','agent','employer','mentor','partner','admin','administrator')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id);

-- 2) Single role per user
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_unique ON public.user_roles(user_id);

-- 3) Drop switch-role helpers
DROP FUNCTION IF EXISTS public.set_user_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_user_role(uuid, public.app_role) CASCADE;

-- 4) Recreate enum without 'user' and 'moderator'
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('job_seeker','agent','employer','partner','mentor','admin');
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role_old) CASCADE;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
DROP TYPE public.app_role_old CASCADE;

-- 5) Functions
CREATE OR REPLACE FUNCTION public.is_employer_or_agent(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id,'employer'::public.app_role) OR public.has_role(_user_id,'agent'::public.app_role) $$;

CREATE OR REPLACE FUNCTION public.ensure_employer_profile_on_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IN ('employer','agent') THEN
    INSERT INTO public.employer_profiles (id, verification_status, is_verified)
    VALUES (NEW.user_id, 'pending', false) ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ensure_employer_profile_on_role_trg
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.ensure_employer_profile_on_role();

INSERT INTO public.employer_profiles (id, verification_status, is_verified)
SELECT ur.user_id, 'pending', false FROM public.user_roles ur
WHERE ur.role IN ('employer','agent') ON CONFLICT (id) DO NOTHING;

-- Re-attach signup-bonus trigger to user_roles (was on profiles.primary_role)
CREATE OR REPLACE FUNCTION public._trg_profile_signup_bonus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.try_grant_signup_bonus(NEW.user_id); RETURN NEW; END $$;
CREATE TRIGGER trg_signup_bonus_on_role
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public._trg_profile_signup_bonus();

CREATE OR REPLACE FUNCTION public.lookup_employer_verification_status(_email text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _uid uuid; _status text;
BEGIN
  IF _email IS NULL OR length(trim(_email))=0 THEN RETURN NULL; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email)=lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RETURN NULL; END IF;
  IF NOT (public.has_role(_uid,'employer'::public.app_role) OR public.has_role(_uid,'agent'::public.app_role)) THEN RETURN NULL; END IF;
  SELECT verification_status INTO _status FROM public.employer_profiles WHERE id=_uid;
  RETURN _status;
END $$;

CREATE OR REPLACE FUNCTION public.admin_verify_employer(_employer_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); v_is_agent boolean; v_is_verified boolean;
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::public.app_role) OR public.has_role(v_caller,'partner'::public.app_role)) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _status NOT IN ('verified','approved','rejected','pending') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  v_is_agent := public.has_role(_employer_id,'agent'::public.app_role);
  v_is_verified := (_status IN ('verified','approved')) AND NOT v_is_agent;
  UPDATE public.employer_profiles SET verification_status=_status, is_verified=v_is_verified, updated_at=now() WHERE id=_employer_id;
  IF _status IN ('verified','approved') THEN
    BEGIN PERFORM public.admin_confirm_user_email(_employer_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (_employer_id,'system',
    CASE WHEN v_is_verified OR _status IN ('verified','approved') THEN 'Your account is verified! ✅' ELSE 'Verification update' END,
    CASE WHEN v_is_verified OR _status IN ('verified','approved') THEN 'သင့်အကောင့် အတည်ပြုပြီ! ✅' ELSE 'အတည်ပြုမှု အခြေအနေ' END,
    CASE WHEN _status IN ('verified','approved') THEN 'You can now post jobs and manage applications.' ELSE COALESCE(_reason,'Your profile was not approved.') END,
    CASE WHEN _status IN ('verified','approved') THEN 'အလုပ်များ တင်ပြီး လျှောက်လွှာများ စီမံနိုင်ပါပြီ။' ELSE COALESCE(_reason,'သင့်ပရိုဖိုင် အတည်ပြုခြင်း မရှိပါ။') END,
    CASE WHEN v_is_agent THEN '/agent/dashboard' ELSE '/employer/dashboard' END);
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'employer_'||_status,'employer_profile',_employer_id::text, jsonb_build_object('reason',_reason,'is_agent',v_is_agent));
  RETURN jsonb_build_object('ok',true,'status',_status,'is_verified',v_is_verified);
END $$;

CREATE OR REPLACE FUNCTION public.try_grant_signup_bonus(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bonus bigint := 1000; v_tx uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_transactions WHERE user_id=_user_id AND ref_type='signup_bonus') THEN RETURN false; END IF;
  IF NOT (public.has_role(_user_id,'job_seeker'::public.app_role) OR public.has_role(_user_id,'mentor'::public.app_role)) THEN RETURN false; END IF;
  INSERT INTO public.wallets(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallet_transactions(user_id, kind, credits, mmk_amount, status, ref_type, ref_id, idempotency_key, note, created_by)
  VALUES (_user_id,'topup',v_bonus,v_bonus,'completed','signup_bonus',_user_id::text,'signup_bonus:'||_user_id::text,'Welcome bonus',_user_id)
  RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(_user_id, v_bonus, v_bonus);
  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (_user_id,'payment','🎁 Welcome bonus: 1,000 Ks','🎁 ကြိုဆိုဆုကြေး: 1,000 Ks',
    '1,000 Ks added to your wallet. Enjoy!','သင့်ပိုက်ဆံအိတ်ထဲ 1,000 Ks ထည့်ပေးပြီးပါပြီ။','/wallet');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.match_candidates_for_job(_job_id uuid, _limit integer DEFAULT 30)
RETURNS TABLE(seeker_user_id uuid, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH job AS (SELECT j.embedding, j.employer_id FROM public.jobs j WHERE j.id=_job_id)
  SELECT p.id, 1 - (p.embedding <=> (SELECT embedding FROM job))
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id=p.id AND ur.role='job_seeker'
  WHERE auth.uid() IS NOT NULL AND (SELECT employer_id FROM job)=auth.uid()
    AND (SELECT embedding FROM job) IS NOT NULL AND p.embedding IS NOT NULL AND p.id<>auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.job_candidate_rejections r WHERE r.job_id=_job_id AND r.seeker_user_id=p.id)
  ORDER BY p.embedding <=> (SELECT embedding FROM job) LIMIT GREATEST(_limit,1);
$$;

-- 6) Signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_meta text := COALESCE(NEW.raw_user_meta_data->>'primary_role', NEW.raw_user_meta_data->>'role','job_seeker');
        v_role public.app_role;
BEGIN
  v_role := CASE v_meta
    WHEN 'jobseeker' THEN 'job_seeker'::public.app_role
    WHEN 'job_seeker' THEN 'job_seeker'::public.app_role
    WHEN 'employer' THEN 'employer'::public.app_role
    WHEN 'agent' THEN 'agent'::public.app_role
    WHEN 'mentor' THEN 'mentor'::public.app_role
    ELSE 'job_seeker'::public.app_role END;
  INSERT INTO public.profiles(id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (NEW.id,'system','👋 Welcome to ThweSone!','👋 ThweSone မှ ကြိုဆိုပါသည်!',
    'Complete your profile to get started. Explore jobs, connect with mentors, and join our community.',
    'စတင်ရန် သင့်ပရိုဖိုင်ကို ဖြည့်စွက်ပါ။ AI Mentor များနှင့် ချိတ်ဆက်ပြီး ကျွန်ုပ်တို့ community တွင် ပါဝင်ပါ။','/profile');
  RETURN NEW;
END $$;

-- 7) profiles_public view
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT id, display_name, avatar_url, headline, bio, location, website,
       skills, languages, experience, visibility, remote_ready, has_laptop,
       internet_stable, has_wise, has_payoneer, has_upwork, referral_code,
       preferred_work_types, role_title, last_seen_at, created_at, updated_at,
       CASE WHEN auth.uid()=id OR public.has_role(auth.uid(),'admin'::public.app_role) THEN email ELSE NULL END AS email,
       CASE WHEN auth.uid()=id OR public.has_role(auth.uid(),'admin'::public.app_role) THEN phone ELSE NULL END AS phone
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 8) Drop primary_role
ALTER TABLE public.profiles DROP COLUMN IF EXISTS primary_role;

-- 9) Rename subscription_plans.role
ALTER TABLE public.subscription_plans RENAME COLUMN role TO plan_for_role;
