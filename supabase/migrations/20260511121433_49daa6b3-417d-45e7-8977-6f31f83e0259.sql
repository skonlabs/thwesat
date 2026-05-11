
-- 1) pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Embedding columns on jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_input_hash text,
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- 3) Embedding columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_input_hash text,
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- 4) IVFFlat index on jobs.embedding for fast cosine similarity search.
-- Safe to create even when empty; may be rebuilt later as data grows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='jobs_embedding_cosine_idx'
  ) THEN
    CREATE INDEX jobs_embedding_cosine_idx
      ON public.jobs USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END IF;
END $$;

-- 5) Match function — returns active jobs ranked by cosine similarity to the user's profile embedding.
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
    AND j.embedding IS NOT NULL
    AND (SELECT embedding FROM me) IS NOT NULL
  ORDER BY j.embedding <=> (SELECT embedding FROM me)
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.match_jobs_for_user(uuid, int) TO authenticated;
