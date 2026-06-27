
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.jobseeker_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  headline text DEFAULT '',
  bio text DEFAULT '',
  location text DEFAULT '',
  website text DEFAULT '',
  skills text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  experience text DEFAULT '',
  visibility text DEFAULT 'public',
  remote_ready boolean DEFAULT false,
  has_laptop boolean DEFAULT false,
  internet_stable boolean DEFAULT false,
  has_wise boolean DEFAULT false,
  has_upwork boolean DEFAULT false,
  has_payoneer boolean DEFAULT false,
  preferred_work_types text[] DEFAULT '{}',
  role_title text DEFAULT '',
  referral_code text,
  referred_by text DEFAULT '',
  job_search_status text NOT NULL DEFAULT 'open',
  embedding public.vector,
  embedding_input_hash text,
  embedding_updated_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobseeker_profiles TO authenticated;
GRANT ALL ON public.jobseeker_profiles TO service_role;
ALTER TABLE public.jobseeker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobseeker self read" ON public.jobseeker_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "jobseeker self upsert" ON public.jobseeker_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jobseeker self update" ON public.jobseeker_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jobseeker self delete" ON public.jobseeker_profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "jobseeker public visible" ON public.jobseeker_profiles
  FOR SELECT TO authenticated USING (visibility IN ('public','members'));
CREATE POLICY "jobseeker admin read" ON public.jobseeker_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "jobseeker employer read applicants" ON public.jobseeker_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.applicant_id = jobseeker_profiles.user_id
        AND j.employer_id = auth.uid()
    )
  );
CREATE POLICY "jobseeker mentor read mentees" ON public.jobseeker_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.mentor_bookings b
      WHERE b.mentee_id = jobseeker_profiles.user_id
        AND b.mentor_id = auth.uid()
        AND b.status IN ('confirmed','completed')
    )
  );

CREATE TABLE IF NOT EXISTS public.agent_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  headline text DEFAULT '',
  bio text DEFAULT '',
  location text DEFAULT '',
  website text DEFAULT '',
  languages text[] DEFAULT '{}',
  visibility text DEFAULT 'public',
  referral_code text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_profiles TO authenticated;
GRANT ALL ON public.agent_profiles TO service_role;
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent self all" ON public.agent_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent visible to authed" ON public.agent_profiles
  FOR SELECT TO authenticated USING (visibility IN ('public','members'));
CREATE POLICY "agent admin read" ON public.agent_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.partner_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  code text UNIQUE,
  organization_name text DEFAULT '',
  contact_email text,
  contract_start_date date,
  contract_end_date date,
  maintenance_rate_y2 numeric,
  maintenance_rate_y3plus numeric,
  payout_cap_pct numeric,
  is_active boolean DEFAULT true,
  notes text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_profiles TO authenticated;
GRANT ALL ON public.partner_profiles TO service_role;
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner self all" ON public.partner_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "partner admin read" ON public.partner_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_profiles TO authenticated;
GRANT ALL ON public.admin_profiles TO service_role;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin self all" ON public.admin_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read all admins" ON public.admin_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS headline text DEFAULT '',
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_code text;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS headline text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS location text DEFAULT '',
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_code text;

INSERT INTO public.jobseeker_profiles (
  user_id, display_name, avatar_url, headline, bio, location, website,
  skills, languages, experience, visibility, remote_ready, has_laptop,
  internet_stable, has_wise, has_upwork, has_payoneer, preferred_work_types,
  role_title, referral_code, referred_by, job_search_status,
  embedding, embedding_input_hash, embedding_updated_at, last_seen_at,
  created_at, updated_at
)
SELECT p.id, p.display_name, p.avatar_url, p.headline, p.bio, p.location, p.website,
  p.skills, p.languages, p.experience, p.visibility, p.remote_ready, p.has_laptop,
  p.internet_stable, p.has_wise, p.has_upwork, p.has_payoneer, p.preferred_work_types,
  p.role_title, p.referral_code, p.referred_by, p.job_search_status,
  p.embedding, p.embedding_input_hash, p.embedding_updated_at, p.last_seen_at,
  p.created_at, p.updated_at
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'job_seeker'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.agent_profiles (
  user_id, display_name, avatar_url, headline, bio, location, website,
  languages, visibility, referral_code, last_seen_at, created_at, updated_at
)
SELECT p.id, p.display_name, p.avatar_url, p.headline, p.bio, p.location, p.website,
  p.languages, p.visibility, p.referral_code, p.last_seen_at, p.created_at, p.updated_at
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'agent'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.admin_profiles (user_id, display_name, avatar_url, last_seen_at, created_at, updated_at)
SELECT p.id, p.display_name, p.avatar_url, p.last_seen_at, p.created_at, p.updated_at
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.partner_profiles (
  user_id, display_name, avatar_url, code, organization_name, contact_email,
  contract_start_date, contract_end_date, maintenance_rate_y2, maintenance_rate_y3plus,
  payout_cap_pct, is_active, notes, last_seen_at, created_at, updated_at
)
SELECT p.id, p.display_name, p.avatar_url,
  pt.code, pt.name, pt.contact_email,
  pt.contract_start_date, pt.contract_end_date, pt.maintenance_rate_y2, pt.maintenance_rate_y3plus,
  pt.payout_cap_pct, COALESCE(pt.is_active, true), pt.notes,
  p.last_seen_at, p.created_at, p.updated_at
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'partner'
LEFT JOIN public.partners pt ON pt.user_id = p.id
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.mentor_profiles mp
SET display_name = COALESCE(NULLIF(mp.display_name,''), p.display_name, ''),
    avatar_url   = COALESCE(mp.avatar_url, p.avatar_url),
    headline     = COALESCE(NULLIF(mp.headline,''), p.headline, ''),
    languages    = COALESCE(NULLIF(mp.languages,'{}'), p.languages, '{}'),
    visibility   = COALESCE(mp.visibility, p.visibility, 'public'),
    last_seen_at = COALESCE(mp.last_seen_at, p.last_seen_at),
    referral_code= COALESCE(mp.referral_code, p.referral_code)
FROM public.profiles p
WHERE p.id = mp.id;

UPDATE public.employer_profiles ep
SET display_name = COALESCE(NULLIF(ep.display_name,''), p.display_name, ep.company_name, ''),
    avatar_url   = COALESCE(ep.avatar_url, ep.logo_url, p.avatar_url),
    headline     = COALESCE(NULLIF(ep.headline,''), p.headline, ''),
    bio          = COALESCE(NULLIF(ep.bio,''), ep.company_description, p.bio, ''),
    location     = COALESCE(NULLIF(ep.location,''), ep.hq_country, p.location, ''),
    languages    = COALESCE(NULLIF(ep.languages,'{}'), p.languages, '{}'),
    visibility   = COALESCE(ep.visibility, p.visibility, 'public'),
    last_seen_at = COALESCE(ep.last_seen_at, p.last_seen_at),
    referral_code= COALESCE(ep.referral_code, p.referral_code)
FROM public.profiles p
WHERE p.id = ep.id;

CREATE OR REPLACE VIEW public.v_user_directory AS
  SELECT user_id AS id, display_name, avatar_url, headline, location, 'job_seeker'::text AS role, last_seen_at
    FROM public.jobseeker_profiles
  UNION ALL
  SELECT user_id, display_name, avatar_url, headline, location, 'agent', last_seen_at
    FROM public.agent_profiles
  UNION ALL
  SELECT user_id, display_name, avatar_url, NULL::text, NULL::text, 'partner', last_seen_at
    FROM public.partner_profiles
  UNION ALL
  SELECT user_id, display_name, avatar_url, NULL::text, NULL::text, 'admin', last_seen_at
    FROM public.admin_profiles
  UNION ALL
  SELECT id, display_name, avatar_url, headline, location, 'mentor', last_seen_at
    FROM public.mentor_profiles
  UNION ALL
  SELECT id, display_name, avatar_url, headline, location, 'employer', last_seen_at
    FROM public.employer_profiles;

GRANT SELECT ON public.v_user_directory TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['jobseeker_profiles','agent_profiles','partner_profiles','admin_profiles']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;
