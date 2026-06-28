
-- 1) RPC: update current user's profile (routes to role-specific table)
CREATE OR REPLACE FUNCTION public.update_my_profile(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- jobseeker_profiles (PK user_id)
  UPDATE public.jobseeker_profiles SET
    display_name = COALESCE(p_updates->>'display_name', display_name),
    headline     = COALESCE(p_updates->>'headline', headline),
    bio          = COALESCE(p_updates->>'bio', bio),
    location     = COALESCE(p_updates->>'location', location),
    website      = COALESCE(p_updates->>'website', website),
    avatar_url   = COALESCE(p_updates->>'avatar_url', avatar_url),
    experience   = COALESCE(p_updates->>'experience', experience),
    visibility   = COALESCE(p_updates->>'visibility', visibility),
    role_title   = COALESCE(p_updates->>'role_title', role_title),
    job_search_status = COALESCE(p_updates->>'job_search_status', job_search_status),
    skills       = COALESCE(CASE WHEN p_updates ? 'skills' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'skills')) ELSE skills END, skills),
    languages    = COALESCE(CASE WHEN p_updates ? 'languages' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'languages')) ELSE languages END, languages),
    preferred_work_types = COALESCE(CASE WHEN p_updates ? 'preferred_work_types' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'preferred_work_types')) ELSE preferred_work_types END, preferred_work_types),
    has_payoneer = COALESCE((p_updates->>'has_payoneer')::boolean, has_payoneer),
    has_wise     = COALESCE((p_updates->>'has_wise')::boolean, has_wise),
    has_upwork   = COALESCE((p_updates->>'has_upwork')::boolean, has_upwork),
    has_laptop   = COALESCE((p_updates->>'has_laptop')::boolean, has_laptop),
    internet_stable = COALESCE((p_updates->>'internet_stable')::boolean, internet_stable),
    remote_ready = COALESCE((p_updates->>'remote_ready')::boolean, remote_ready),
    updated_at   = now()
  WHERE user_id = uid;

  -- employer_profiles (PK id)
  UPDATE public.employer_profiles SET
    display_name = COALESCE(p_updates->>'display_name', display_name),
    headline     = COALESCE(p_updates->>'headline', headline),
    bio          = COALESCE(p_updates->>'bio', bio),
    location     = COALESCE(p_updates->>'location', location),
    avatar_url   = COALESCE(p_updates->>'avatar_url', avatar_url),
    visibility   = COALESCE(p_updates->>'visibility', visibility),
    languages    = COALESCE(CASE WHEN p_updates ? 'languages' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'languages')) ELSE languages END, languages),
    updated_at   = now()
  WHERE id = uid;

  -- agent_profiles (PK user_id)
  UPDATE public.agent_profiles SET
    display_name = COALESCE(p_updates->>'display_name', display_name),
    headline     = COALESCE(p_updates->>'headline', headline),
    bio          = COALESCE(p_updates->>'bio', bio),
    location     = COALESCE(p_updates->>'location', location),
    website      = COALESCE(p_updates->>'website', website),
    avatar_url   = COALESCE(p_updates->>'avatar_url', avatar_url),
    visibility   = COALESCE(p_updates->>'visibility', visibility),
    languages    = COALESCE(CASE WHEN p_updates ? 'languages' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'languages')) ELSE languages END, languages),
    updated_at   = now()
  WHERE user_id = uid;

  -- mentor_profiles (PK id)
  UPDATE public.mentor_profiles SET
    display_name = COALESCE(p_updates->>'display_name', display_name),
    headline     = COALESCE(p_updates->>'headline', headline),
    bio          = COALESCE(p_updates->>'bio', bio),
    location     = COALESCE(p_updates->>'location', location),
    avatar_url   = COALESCE(p_updates->>'avatar_url', avatar_url),
    visibility   = COALESCE(p_updates->>'visibility', visibility),
    languages    = COALESCE(CASE WHEN p_updates ? 'languages' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'languages')) ELSE languages END, languages),
    updated_at   = now()
  WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(jsonb) TO authenticated;

-- 2) RPC: touch presence on whichever role-specific table exists for the caller
CREATE OR REPLACE FUNCTION public.touch_my_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ts timestamptz := now();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  UPDATE public.jobseeker_profiles SET last_seen_at = ts WHERE user_id = uid;
  UPDATE public.employer_profiles  SET last_seen_at = ts WHERE id = uid;
  UPDATE public.agent_profiles     SET last_seen_at = ts WHERE user_id = uid;
  UPDATE public.mentor_profiles    SET last_seen_at = ts WHERE id = uid;
  UPDATE public.partner_profiles   SET last_seen_at = ts WHERE user_id = uid;
  UPDATE public.admin_profiles     SET last_seen_at = ts WHERE user_id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_my_presence() TO authenticated;

-- 3) Drop the redundant shims
DROP VIEW IF EXISTS public.profiles;
DROP VIEW IF EXISTS public.employer_profiles_public;
