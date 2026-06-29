
-- 1. Grant EXECUTE on get_my_contact_info so PostgREST stops returning 404.
GRANT EXECUTE ON FUNCTION public.get_my_contact_info() TO anon, authenticated, service_role;

-- 2. Recreate v_profiles WITHOUT the auth.users join so security_invoker=true
--    no longer 403s for authenticated users (they cannot read auth.users).
--    Email/phone are served exclusively via the get_my_contact_info RPC.
DROP VIEW IF EXISTS public.v_profiles CASCADE;

CREATE VIEW public.v_profiles
WITH (security_invoker = true) AS
WITH ids AS (
  SELECT user_id AS id FROM public.jobseeker_profiles
  UNION SELECT id FROM public.employer_profiles
  UNION SELECT user_id FROM public.agent_profiles
  UNION SELECT id FROM public.mentor_profiles
  UNION SELECT user_id FROM public.partner_profiles
  UNION SELECT user_id FROM public.admin_profiles
)
SELECT
  ids.id,
  COALESCE(jp.display_name, ep.display_name, ap.display_name, mp.display_name, pp.display_name, adp.display_name, '') AS display_name,
  COALESCE(jp.avatar_url, ep.avatar_url, ap.avatar_url, mp.avatar_url, pp.avatar_url, adp.avatar_url) AS avatar_url,
  COALESCE(jp.headline, ep.headline, ap.headline, mp.headline) AS headline,
  COALESCE(jp.bio, ep.bio, ap.bio, mp.bio) AS bio,
  COALESCE(jp.location, ep.location, ap.location, mp.location) AS location,
  COALESCE(jp.website, ap.website) AS website,
  jp.skills,
  COALESCE(jp.languages, ep.languages, ap.languages, mp.languages) AS languages,
  jp.experience,
  COALESCE(jp.visibility, ep.visibility, ap.visibility, mp.visibility, 'members') AS visibility,
  jp.remote_ready,
  COALESCE(jp.created_at, ep.created_at, ap.created_at, mp.created_at, pp.created_at, adp.created_at) AS created_at,
  COALESCE(jp.updated_at, ep.updated_at, ap.updated_at, mp.updated_at, pp.updated_at, adp.updated_at) AS updated_at,
  jp.role_title,
  jp.preferred_work_types,
  jp.has_payoneer,
  jp.has_wise,
  jp.has_upwork,
  jp.has_laptop,
  jp.internet_stable,
  COALESCE(jp.referral_code, ep.referral_code, ap.referral_code, mp.referral_code) AS referral_code,
  jp.referred_by,
  COALESCE(jp.last_seen_at, ep.last_seen_at, ap.last_seen_at, mp.last_seen_at, pp.last_seen_at, adp.last_seen_at) AS last_seen_at,
  uas.deletion_scheduled_at,
  uas.deletion_requested_at,
  jp.embedding,
  jp.embedding_input_hash,
  jp.embedding_updated_at,
  jp.job_search_status,
  COALESCE(uas.is_suspended, false) AS is_suspended
FROM ids
LEFT JOIN public.jobseeker_profiles  jp  ON jp.user_id = ids.id
LEFT JOIN public.employer_profiles   ep  ON ep.id      = ids.id
LEFT JOIN public.agent_profiles      ap  ON ap.user_id = ids.id
LEFT JOIN public.mentor_profiles     mp  ON mp.id      = ids.id
LEFT JOIN public.partner_profiles    pp  ON pp.user_id = ids.id
LEFT JOIN public.admin_profiles      adp ON adp.user_id = ids.id
LEFT JOIN public.user_account_state  uas ON uas.user_id = ids.id;

GRANT SELECT ON public.v_profiles TO anon, authenticated;
GRANT ALL    ON public.v_profiles TO service_role;
