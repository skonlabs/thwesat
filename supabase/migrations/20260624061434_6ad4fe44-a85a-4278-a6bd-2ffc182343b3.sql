-- ============================================================
-- Candidate Matching Pack — per-job match cache + rejections
-- ============================================================

-- 1) Rejections table (employer hides a seeker for a given job)
CREATE TABLE IF NOT EXISTS public.job_candidate_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  seeker_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, seeker_user_id)
);
CREATE INDEX IF NOT EXISTS idx_job_cand_rej_job ON public.job_candidate_rejections (job_id);
CREATE INDEX IF NOT EXISTS idx_job_cand_rej_employer ON public.job_candidate_rejections (employer_user_id);

GRANT SELECT, INSERT, DELETE ON public.job_candidate_rejections TO authenticated;
GRANT ALL ON public.job_candidate_rejections TO service_role;

ALTER TABLE public.job_candidate_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employer can read own rejections"
  ON public.job_candidate_rejections FOR SELECT TO authenticated
  USING (employer_user_id = auth.uid());

CREATE POLICY "Employer can insert own rejections"
  ON public.job_candidate_rejections FOR INSERT TO authenticated
  WITH CHECK (
    employer_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_id = auth.uid())
  );

CREATE POLICY "Employer can delete own rejections"
  ON public.job_candidate_rejections FOR DELETE TO authenticated
  USING (employer_user_id = auth.uid());

-- 2) Match cache
CREATE TABLE IF NOT EXISTS public.job_candidate_matches (
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  seeker_user_id uuid NOT NULL,
  score double precision NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, seeker_user_id)
);
CREATE INDEX IF NOT EXISTS idx_job_cand_matches_job_score
  ON public.job_candidate_matches (job_id, score DESC);

GRANT SELECT ON public.job_candidate_matches TO authenticated;
GRANT ALL ON public.job_candidate_matches TO service_role;

ALTER TABLE public.job_candidate_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job owner can read match cache"
  ON public.job_candidate_matches FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id AND j.employer_id = auth.uid()
  ));

-- 3) Live ranker — returns top N seekers for a job by cosine similarity,
--    excluding rejected ones. Only the job's owner gets data back.
CREATE OR REPLACE FUNCTION public.match_candidates_for_job(_job_id uuid, _limit int DEFAULT 30)
RETURNS TABLE(seeker_user_id uuid, similarity float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH job AS (
    SELECT j.embedding, j.employer_id
    FROM public.jobs j
    WHERE j.id = _job_id
  )
  SELECT p.id AS seeker_user_id,
         1 - (p.embedding <=> (SELECT embedding FROM job)) AS similarity
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND (SELECT employer_id FROM job) = auth.uid()
    AND (SELECT embedding FROM job) IS NOT NULL
    AND p.embedding IS NOT NULL
    AND p.id <> auth.uid()
    AND COALESCE(p.primary_role, 'jobseeker') = 'jobseeker'
    AND NOT EXISTS (
      SELECT 1 FROM public.job_candidate_rejections r
      WHERE r.job_id = _job_id AND r.seeker_user_id = p.id
    )
  ORDER BY p.embedding <=> (SELECT embedding FROM job)
  LIMIT GREATEST(_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.match_candidates_for_job(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_candidates_for_job(uuid, int) TO authenticated;