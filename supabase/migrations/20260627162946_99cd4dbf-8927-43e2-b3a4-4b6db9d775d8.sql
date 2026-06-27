
-- 1) user_account_state
CREATE TABLE public.user_account_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  deletion_requested_at timestamptz,
  deletion_scheduled_at timestamptz,
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_account_state TO authenticated;
GRANT ALL ON public.user_account_state TO service_role;
ALTER TABLE public.user_account_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uas self read" ON public.user_account_state FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "uas self write" ON public.user_account_state FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "uas admin all" ON public.user_account_state FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.user_account_state(user_id, deletion_requested_at, deletion_scheduled_at, is_suspended)
SELECT id, deletion_requested_at, deletion_scheduled_at, COALESCE(is_suspended,false) FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE TRIGGER set_updated_at_user_account_state BEFORE UPDATE ON public.user_account_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Drop triggers on legacy profiles before rename
DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;
DROP TRIGGER IF EXISTS trg_mint_referral_codes_on_profile ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;

-- 3) Rename legacy table
ALTER TABLE public.profiles RENAME TO _profiles_legacy;

-- 4) Create backward-compat view
CREATE VIEW public.profiles
WITH (security_invoker = true) AS
SELECT
  u.id AS id,
  COALESCE(jp.display_name, ep.display_name, ap.display_name, mp.display_name, pp.display_name, adp.display_name, '')::text AS display_name,
  u.email::text AS email,
  COALESCE(jp.avatar_url, ep.avatar_url, ap.avatar_url, mp.avatar_url, pp.avatar_url, adp.avatar_url)::text AS avatar_url,
  COALESCE(jp.headline, ep.headline, ap.headline, mp.headline)::text AS headline,
  COALESCE(jp.bio, ep.bio, ap.bio, mp.bio)::text AS bio,
  COALESCE(jp.location, ep.location, ap.location, mp.location)::text AS location,
  u.phone::text AS phone,
  COALESCE(jp.website, ap.website)::text AS website,
  jp.skills AS skills,
  COALESCE(jp.languages, ep.languages, ap.languages, mp.languages) AS languages,
  jp.experience::text AS experience,
  COALESCE(jp.visibility, ep.visibility, ap.visibility, mp.visibility, 'members')::text AS visibility,
  jp.remote_ready AS remote_ready,
  COALESCE(jp.created_at, ep.created_at, ap.created_at, mp.created_at, pp.created_at, adp.created_at, u.created_at) AS created_at,
  COALESCE(jp.updated_at, ep.updated_at, ap.updated_at, mp.updated_at, pp.updated_at, adp.updated_at) AS updated_at,
  jp.role_title::text AS role_title,
  jp.preferred_work_types AS preferred_work_types,
  jp.has_payoneer AS has_payoneer,
  jp.has_wise AS has_wise,
  jp.has_upwork AS has_upwork,
  jp.has_laptop AS has_laptop,
  jp.internet_stable AS internet_stable,
  COALESCE(jp.referral_code, ep.referral_code, ap.referral_code, mp.referral_code)::text AS referral_code,
  jp.referred_by::text AS referred_by,
  COALESCE(jp.last_seen_at, ep.last_seen_at, ap.last_seen_at, mp.last_seen_at, pp.last_seen_at, adp.last_seen_at) AS last_seen_at,
  uas.deletion_scheduled_at AS deletion_scheduled_at,
  uas.deletion_requested_at AS deletion_requested_at,
  jp.embedding AS embedding,
  jp.embedding_input_hash::text AS embedding_input_hash,
  jp.embedding_updated_at AS embedding_updated_at,
  jp.job_search_status::text AS job_search_status,
  COALESCE(uas.is_suspended, false) AS is_suspended
FROM auth.users u
LEFT JOIN public.jobseeker_profiles jp ON jp.user_id = u.id
LEFT JOIN public.employer_profiles ep ON ep.id = u.id
LEFT JOIN public.agent_profiles ap ON ap.user_id = u.id
LEFT JOIN public.mentor_profiles mp ON mp.id = u.id
LEFT JOIN public.partner_profiles pp ON pp.user_id = u.id
LEFT JOIN public.admin_profiles adp ON adp.user_id = u.id
LEFT JOIN public.user_account_state uas ON uas.user_id = u.id
WHERE jp.user_id IS NOT NULL OR ep.id IS NOT NULL OR ap.user_id IS NOT NULL
   OR mp.id IS NOT NULL OR pp.user_id IS NOT NULL OR adp.user_id IS NOT NULL;

-- 5) Grants — non-PII to anon/authenticated; full select for service_role
GRANT SELECT (id, display_name, avatar_url, headline, bio, location, website, skills, languages, experience, visibility, remote_ready, created_at, updated_at, role_title, preferred_work_types, has_payoneer, has_wise, has_upwork, has_laptop, internet_stable, referral_code, referred_by, last_seen_at, deletion_scheduled_at, deletion_requested_at, embedding, embedding_input_hash, embedding_updated_at, job_search_status, is_suspended) ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.profiles TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated, service_role;

-- 6) INSTEAD OF UPDATE trigger — dispatches to the correct role table
CREATE OR REPLACE FUNCTION public.profiles_view_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_role text;
BEGIN
  -- Only allow self-update unless caller is admin/service_role
  IF auth.uid() IS NOT NULL AND auth.uid() <> NEW.id AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;

  -- Account-level fields
  IF NEW.deletion_scheduled_at IS DISTINCT FROM OLD.deletion_scheduled_at
     OR NEW.deletion_requested_at IS DISTINCT FROM OLD.deletion_requested_at
     OR COALESCE(NEW.is_suspended,false) IS DISTINCT FROM COALESCE(OLD.is_suspended,false) THEN
    INSERT INTO public.user_account_state(user_id, deletion_scheduled_at, deletion_requested_at, is_suspended)
    VALUES (NEW.id, NEW.deletion_scheduled_at, NEW.deletion_requested_at, COALESCE(NEW.is_suspended,false))
    ON CONFLICT (user_id) DO UPDATE SET
      deletion_scheduled_at = EXCLUDED.deletion_scheduled_at,
      deletion_requested_at = EXCLUDED.deletion_requested_at,
      is_suspended = EXCLUDED.is_suspended,
      updated_at = now();
  END IF;

  IF v_role = 'job_seeker' THEN
    UPDATE public.jobseeker_profiles SET
      display_name = COALESCE(NEW.display_name, display_name),
      avatar_url = NEW.avatar_url, headline = NEW.headline, bio = NEW.bio,
      location = NEW.location, website = NEW.website,
      skills = NEW.skills, languages = NEW.languages, experience = NEW.experience,
      visibility = COALESCE(NEW.visibility, visibility),
      remote_ready = NEW.remote_ready,
      role_title = NEW.role_title, preferred_work_types = NEW.preferred_work_types,
      has_payoneer = COALESCE(NEW.has_payoneer, has_payoneer),
      has_wise = COALESCE(NEW.has_wise, has_wise),
      has_upwork = COALESCE(NEW.has_upwork, has_upwork),
      has_laptop = COALESCE(NEW.has_laptop, has_laptop),
      internet_stable = COALESCE(NEW.internet_stable, internet_stable),
      referral_code = COALESCE(NEW.referral_code, referral_code),
      referred_by = COALESCE(NEW.referred_by, referred_by),
      last_seen_at = NEW.last_seen_at,
      embedding = NEW.embedding,
      embedding_input_hash = NEW.embedding_input_hash,
      embedding_updated_at = NEW.embedding_updated_at,
      job_search_status = NEW.job_search_status,
      updated_at = now()
    WHERE user_id = NEW.id;
  ELSIF v_role = 'employer' THEN
    UPDATE public.employer_profiles SET
      display_name = COALESCE(NEW.display_name, display_name),
      avatar_url = NEW.avatar_url, headline = NEW.headline, bio = NEW.bio,
      location = NEW.location, languages = NEW.languages,
      visibility = COALESCE(NEW.visibility, visibility),
      referral_code = COALESCE(NEW.referral_code, referral_code),
      last_seen_at = NEW.last_seen_at, updated_at = now()
    WHERE id = NEW.id;
  ELSIF v_role = 'agent' THEN
    UPDATE public.agent_profiles SET
      display_name = COALESCE(NEW.display_name, display_name),
      avatar_url = NEW.avatar_url, headline = NEW.headline, bio = NEW.bio,
      location = NEW.location, website = NEW.website, languages = NEW.languages,
      visibility = COALESCE(NEW.visibility, visibility),
      referral_code = COALESCE(NEW.referral_code, referral_code),
      last_seen_at = NEW.last_seen_at, updated_at = now()
    WHERE user_id = NEW.id;
  ELSIF v_role = 'mentor' THEN
    UPDATE public.mentor_profiles SET
      display_name = COALESCE(NEW.display_name, display_name),
      avatar_url = NEW.avatar_url, headline = NEW.headline, bio = NEW.bio,
      location = NEW.location, languages = NEW.languages,
      visibility = COALESCE(NEW.visibility, visibility),
      referral_code = COALESCE(NEW.referral_code, referral_code),
      last_seen_at = NEW.last_seen_at, updated_at = now()
    WHERE id = NEW.id;
  ELSIF v_role = 'partner' THEN
    UPDATE public.partner_profiles SET
      display_name = COALESCE(NEW.display_name, display_name),
      avatar_url = NEW.avatar_url,
      last_seen_at = NEW.last_seen_at, updated_at = now()
    WHERE user_id = NEW.id;
  ELSIF v_role = 'admin' THEN
    UPDATE public.admin_profiles SET
      display_name = COALESCE(NEW.display_name, display_name),
      avatar_url = NEW.avatar_url,
      last_seen_at = NEW.last_seen_at, updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_view_update_trigger INSTEAD OF UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_view_update();

-- 7) INSTEAD OF INSERT trigger (defensive — signup writes go through role tables directly)
CREATE OR REPLACE FUNCTION public.profiles_view_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;
  IF v_role IS NULL THEN v_role := 'job_seeker'; END IF;

  IF v_role = 'job_seeker' THEN
    INSERT INTO public.jobseeker_profiles(user_id, display_name, avatar_url, headline, bio, location, website, skills, languages, experience, visibility, remote_ready)
    VALUES (NEW.id, COALESCE(NEW.display_name,''), NEW.avatar_url, NEW.headline, NEW.bio, NEW.location, NEW.website, NEW.skills, NEW.languages, NEW.experience, COALESCE(NEW.visibility,'members'), NEW.remote_ready)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'employer' THEN
    INSERT INTO public.employer_profiles(id, display_name) VALUES (NEW.id, COALESCE(NEW.display_name,'')) ON CONFLICT (id) DO NOTHING;
  ELSIF v_role = 'agent' THEN
    INSERT INTO public.agent_profiles(user_id, display_name) VALUES (NEW.id, COALESCE(NEW.display_name,'')) ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'mentor' THEN
    INSERT INTO public.mentor_profiles(id, display_name) VALUES (NEW.id, COALESCE(NEW.display_name,'')) ON CONFLICT (id) DO NOTHING;
  ELSIF v_role = 'partner' THEN
    INSERT INTO public.partner_profiles(user_id, display_name) VALUES (NEW.id, COALESCE(NEW.display_name,'')) ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'admin' THEN
    INSERT INTO public.admin_profiles(user_id, display_name) VALUES (NEW.id, COALESCE(NEW.display_name,'')) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF NEW.deletion_scheduled_at IS NOT NULL OR NEW.deletion_requested_at IS NOT NULL OR COALESCE(NEW.is_suspended,false) THEN
    INSERT INTO public.user_account_state(user_id, deletion_scheduled_at, deletion_requested_at, is_suspended)
    VALUES (NEW.id, NEW.deletion_scheduled_at, NEW.deletion_requested_at, COALESCE(NEW.is_suspended,false))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_view_insert_trigger INSTEAD OF INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_view_insert();

-- 8) INSTEAD OF DELETE — admin-only; cascades by deleting the auth user
CREATE OR REPLACE FUNCTION public.profiles_view_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER profiles_view_delete_trigger INSTEAD OF DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_view_delete();

-- 9) Revoke PII on legacy table (defensive)
REVOKE ALL ON public._profiles_legacy FROM anon, authenticated;
GRANT SELECT ON public._profiles_legacy TO service_role;
