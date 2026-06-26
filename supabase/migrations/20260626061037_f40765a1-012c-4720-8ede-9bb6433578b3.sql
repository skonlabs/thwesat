
-- Block anonymous PostgREST access to profile contact columns.
-- (Authenticated keeps SELECT for compatibility with code paths that do select *.)
REVOKE SELECT (email, phone) ON public.profiles FROM anon;
