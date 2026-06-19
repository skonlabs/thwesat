-- feature_job_with_quota: consume a featured_job quota slot to mark an existing job as featured
CREATE OR REPLACE FUNCTION public.feature_job_with_quota(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_job public.jobs;
  v_q public.subscription_quotas;
  v_remaining integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = _job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'job_not_found';
  END IF;
  IF v_job.employer_id <> v_user THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  IF v_job.is_featured THEN
    RETURN jsonb_build_object('already_featured', true, 'job_id', _job_id);
  END IF;

  SELECT * INTO v_q FROM public.subscription_quotas WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_active_subscription' USING HINT='Subscribe or buy a Featured Job add-on.';
  END IF;

  v_remaining := COALESCE(v_q.featured_jobs_total,0) - COALESCE(v_q.featured_jobs_used,0);
  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'quota_exhausted_featured' USING HINT='Buy a Featured Job add-on to feature this listing.';
  END IF;

  -- Trigger sync_job_quotas will recompute featured_jobs_used after this update.
  UPDATE public.jobs SET is_featured = true, updated_at = now() WHERE id = _job_id;

  RETURN jsonb_build_object('ok', true, 'job_id', _job_id, 'remaining', v_remaining - 1);
END;
$$;

REVOKE ALL ON FUNCTION public.feature_job_with_quota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feature_job_with_quota(uuid) TO authenticated;