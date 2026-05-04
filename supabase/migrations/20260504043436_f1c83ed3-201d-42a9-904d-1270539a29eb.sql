
-- Add job_post action price for employers
INSERT INTO public.action_prices (action_key, label_en, label_my, description_en, description_my, price_credits, duration_days, is_active)
VALUES
  ('job_post','Post a job','အလုပ် တင်ရန်','Publish a job listing for 30 days. Pending moderator approval.','30 ရက် အတွင်း အလုပ်ကြော်ငြာ တင်နိုင်သည်။ Moderator အတည်ပြုရန် လိုသည်။', 3000, 30, true),
  ('feature_job_upgrade','Featured upgrade','Featured အဆင့်တင်','Pin to top of search for 7 days.','7 ရက်ကြာ ထိပ်ဆုံးတွင် ပြသမည်။', 7000, 7, true),
  ('mentor_session','Mentor session','Mentor Session','Book a 1-hour mentor session (held in escrow).','Mentor Session 1 နာရီ ဘွတ်ကင်လုပ်ရန်။', 5000, NULL, true),
  ('career_track','Career Track enrollment','Career Track စာရင်းသွင်း','Multi-session mentor program.','Mentor အစီအစဉ် တောင့်တင်းသော session များ။', 25000, NULL, true)
ON CONFLICT (action_key) DO NOTHING;

-- Cron-friendly view: active feature unlocks per (user, key, target)
CREATE OR REPLACE VIEW public.v_active_unlocks AS
SELECT user_id, feature_key, target_id, target_type, expires_at, starts_at, transaction_id
FROM public.feature_unlocks
WHERE is_active = true AND (expires_at IS NULL OR expires_at > now());

GRANT SELECT ON public.v_active_unlocks TO authenticated;

-- Helper: is_featured flag on jobs auto-set if feature_job_upgrade unlock active for that job
CREATE OR REPLACE FUNCTION public.refresh_job_featured(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.jobs SET is_featured = EXISTS (
    SELECT 1 FROM public.feature_unlocks
    WHERE feature_key IN ('feature_job_upgrade','featured_job')
      AND target_id = _job_id::text
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
  WHERE id = _job_id;
END; $$;
