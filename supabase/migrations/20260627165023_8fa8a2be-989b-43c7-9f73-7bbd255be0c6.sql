-- 1) Backfill missing mentor_profiles rows for mentors that lack one
INSERT INTO public.mentor_profiles (id, display_name)
SELECT ur.user_id, COALESCE(u.raw_user_meta_data->>'display_name','')
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.mentor_profiles mp ON mp.id = ur.user_id
WHERE ur.role = 'mentor' AND mp.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2) Migrate stale employer_profiles rows owned by agents into agent_profiles
INSERT INTO public.agent_profiles (user_id, display_name, avatar_url, headline, bio, location, languages, visibility, referral_code, last_seen_at)
SELECT ep.id, COALESCE(ep.display_name, ep.company_name, ''), ep.avatar_url, ep.headline, ep.bio, ep.location, ep.languages, COALESCE(ep.visibility,'members'), ep.referral_code, ep.last_seen_at
FROM public.employer_profiles ep
JOIN public.user_roles ur ON ur.user_id = ep.id AND ur.role = 'agent'
ON CONFLICT (user_id) DO UPDATE SET
  display_name = COALESCE(NULLIF(public.agent_profiles.display_name,''), EXCLUDED.display_name),
  avatar_url   = COALESCE(public.agent_profiles.avatar_url, EXCLUDED.avatar_url),
  headline     = COALESCE(public.agent_profiles.headline, EXCLUDED.headline),
  bio          = COALESCE(public.agent_profiles.bio, EXCLUDED.bio),
  location     = COALESCE(public.agent_profiles.location, EXCLUDED.location),
  languages    = COALESCE(public.agent_profiles.languages, EXCLUDED.languages),
  referral_code= COALESCE(public.agent_profiles.referral_code, EXCLUDED.referral_code),
  last_seen_at = GREATEST(COALESCE(public.agent_profiles.last_seen_at, 'epoch'::timestamptz), COALESCE(EXCLUDED.last_seen_at,'epoch'::timestamptz));

DELETE FROM public.employer_profiles ep
USING public.user_roles ur
WHERE ur.user_id = ep.id AND ur.role = 'agent';

-- 3) Migrate stale employer_profiles rows owned by admins into admin_profiles
INSERT INTO public.admin_profiles (user_id, display_name, avatar_url, last_seen_at)
SELECT ep.id, COALESCE(ep.display_name, ep.company_name, ''), ep.avatar_url, ep.last_seen_at
FROM public.employer_profiles ep
JOIN public.user_roles ur ON ur.user_id = ep.id AND ur.role = 'admin'
ON CONFLICT (user_id) DO UPDATE SET
  display_name = COALESCE(NULLIF(public.admin_profiles.display_name,''), EXCLUDED.display_name),
  avatar_url   = COALESCE(public.admin_profiles.avatar_url, EXCLUDED.avatar_url),
  last_seen_at = GREATEST(COALESCE(public.admin_profiles.last_seen_at,'epoch'::timestamptz), COALESCE(EXCLUDED.last_seen_at,'epoch'::timestamptz));

DELETE FROM public.employer_profiles ep
USING public.user_roles ur
WHERE ur.user_id = ep.id AND ur.role = 'admin';

-- 4) Fix handle_new_user: insert user_roles BEFORE the role-specific profile row,
--    and write directly into the right table instead of going through the view.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_meta text := COALESCE(NEW.raw_user_meta_data->>'primary_role', NEW.raw_user_meta_data->>'role','job_seeker');
  v_role public.app_role;
  v_name text := COALESCE(NEW.raw_user_meta_data->>'display_name','');
BEGIN
  v_role := CASE v_meta
    WHEN 'jobseeker' THEN 'job_seeker'::public.app_role
    WHEN 'job_seeker' THEN 'job_seeker'::public.app_role
    WHEN 'employer' THEN 'employer'::public.app_role
    WHEN 'agent' THEN 'agent'::public.app_role
    WHEN 'mentor' THEN 'mentor'::public.app_role
    WHEN 'partner' THEN 'partner'::public.app_role
    WHEN 'admin' THEN 'admin'::public.app_role
    ELSE 'job_seeker'::public.app_role
  END;

  -- Role first, so any downstream lookup is correct
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  -- Write directly into the role-specific table
  IF v_role = 'job_seeker' THEN
    INSERT INTO public.jobseeker_profiles(user_id, display_name, visibility)
    VALUES (NEW.id, v_name, 'members') ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'employer' THEN
    INSERT INTO public.employer_profiles(id, display_name) VALUES (NEW.id, v_name)
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_role = 'agent' THEN
    INSERT INTO public.agent_profiles(user_id, display_name) VALUES (NEW.id, v_name)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'mentor' THEN
    INSERT INTO public.mentor_profiles(id, display_name) VALUES (NEW.id, v_name)
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_role = 'partner' THEN
    INSERT INTO public.partner_profiles(user_id, display_name) VALUES (NEW.id, v_name)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'admin' THEN
    INSERT INTO public.admin_profiles(user_id, display_name) VALUES (NEW.id, v_name)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (NEW.id,'system','👋 Welcome to ThweSone!','👋 ThweSone မှ ကြိုဆိုပါသည်!',
    'Complete your profile to get started. Explore jobs, connect with mentors, and join our community.',
    'စတင်ရန် သင့်ပရိုဖိုင်ကို ဖြည့်စွက်ပါ။ AI Mentor များနှင့် ချိတ်ဆက်ပြီး ကျွန်ုပ်တို့ community တွင် ပါဝင်ပါ။','/profile');
  RETURN NEW;
END $function$;
