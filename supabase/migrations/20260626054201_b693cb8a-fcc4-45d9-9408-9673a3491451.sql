-- Restore column SELECT grants so profile reads stop failing.
-- The earlier per-column REVOKE on email/phone created explicit ACLs that left newly added
-- columns (job_search_status, is_suspended, embedding*) ungranted, breaking `select *` reads.
GRANT SELECT (email, phone, job_search_status, is_suspended, embedding, embedding_input_hash, embedding_updated_at)
  ON public.profiles TO authenticated;
GRANT SELECT (job_search_status, embedding, embedding_input_hash, embedding_updated_at)
  ON public.profiles TO anon;