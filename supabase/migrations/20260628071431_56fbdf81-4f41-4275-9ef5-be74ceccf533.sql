
-- 1. Compatibility view: profiles → v_profiles (union of role-specific profiles)
CREATE OR REPLACE VIEW public.profiles AS SELECT * FROM public.v_profiles;
GRANT SELECT ON public.profiles TO anon, authenticated;

-- 2. Safe public view of employer profiles (no PII contact fields)
CREATE OR REPLACE VIEW public.employer_profiles_public AS
SELECT
  id,
  company_name,
  company_website,
  company_linkedin,
  company_description,
  industry,
  company_size,
  hq_country,
  full_address,
  vision,
  mission,
  what_we_do,
  benefits,
  logo_url,
  cover_url,
  is_verified,
  verification_status,
  display_name,
  avatar_url,
  headline,
  bio,
  location,
  languages,
  visibility,
  last_seen_at,
  created_at,
  updated_at
FROM public.employer_profiles;

GRANT SELECT ON public.employer_profiles_public TO anon, authenticated;

-- 3. Owner SELECT policy on employer_profiles so the employer can read their own full row
DROP POLICY IF EXISTS "Employers can read own profile" ON public.employer_profiles;
CREATE POLICY "Employers can read own profile"
  ON public.employer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 4. Admins can read every employer profile (for moderation/admin pages)
DROP POLICY IF EXISTS "Admins can read all employer profiles" ON public.employer_profiles;
CREATE POLICY "Admins can read all employer profiles"
  ON public.employer_profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
