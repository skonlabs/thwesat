CREATE OR REPLACE FUNCTION public.match_jobs_for_user(_user_id uuid, _limit int DEFAULT 50)
RETURNS TABLE(job_id uuid, similarity float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT embedding FROM public.profiles WHERE id = _user_id
  )
  SELECT j.id, 1 - (j.embedding <=> (SELECT embedding FROM me)) AS similarity
  FROM public.jobs j
  WHERE j.status = 'active'
    AND (j.expires_at IS NULL OR j.expires_at > now())
    AND j.embedding IS NOT NULL
    AND (SELECT embedding FROM me) IS NOT NULL
  ORDER BY j.embedding <=> (SELECT embedding FROM me)
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.match_jobs_for_user(uuid, int) TO authenticated;