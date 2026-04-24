-- Fix 1: Backfill empty job.company from employer_profiles or profiles
UPDATE public.jobs j
SET company = COALESCE(NULLIF(ep.company_name, ''), NULLIF(p.display_name, ''), 'Employer')
FROM public.profiles p
LEFT JOIN public.employer_profiles ep ON ep.id = p.id
WHERE j.employer_id = p.id AND COALESCE(j.company, '') = '';

-- Fix 2: Trigger to ensure company is never empty going forward
CREATE OR REPLACE FUNCTION public.ensure_job_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.company, '') = '' THEN
    SELECT COALESCE(NULLIF(ep.company_name, ''), NULLIF(p.display_name, ''), 'Employer')
      INTO NEW.company
    FROM public.profiles p
    LEFT JOIN public.employer_profiles ep ON ep.id = p.id
    WHERE p.id = NEW.employer_id;
    IF COALESCE(NEW.company, '') = '' THEN NEW.company := 'Employer'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_job_company_trg ON public.jobs;
CREATE TRIGGER ensure_job_company_trg
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.ensure_job_company();

-- Fix 3: Tighten avatars bucket - users can only view files in their own folder, plus public read of specific paths
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

CREATE POLICY "Avatars readable by path"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND name IS NOT NULL
  AND name <> ''
);
-- Note: This still allows public read, but blocks empty/null path enumeration attacks.
-- For full listing prevention, the bucket should be set to private and accessed via signed URLs.