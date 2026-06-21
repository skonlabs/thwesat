-- Security fix: stop exposing employer contact_email / contact_phone to anonymous visitors.
-- Public-facing screens (CompanyProfile, JobDetail) already read from the safe
-- `employer_profiles_public` view, which excludes contact_email, contact_phone.
-- Authenticated users (owner / admin / moderator / partner / applicants of the
-- employer's jobs) keep their existing RLS-scoped SELECT access to the base table.

DROP POLICY IF EXISTS "Employer profiles readable by anon" ON public.employer_profiles;

-- Tighten table privileges: revoke anon's row read on the base table.
-- (The safe view still exposes the non-sensitive columns to anon.)
REVOKE SELECT ON public.employer_profiles FROM anon;

-- Ensure the safe view is readable by everyone (idempotent)
GRANT SELECT ON public.employer_profiles_public TO anon, authenticated;