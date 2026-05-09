UPDATE public.action_prices SET price_credits = CASE action_key
  WHEN 'job_post' THEN 50000
  WHEN 'featured_job' THEN 10000
  WHEN 'unlock_contact' THEN 25000
  WHEN 'profile_boost' THEN 5000
  WHEN 'priority_application' THEN 10000
  WHEN 'cover_letter' THEN 5000
  WHEN 'cv_rewrite' THEN 10000
  WHEN 'skill_gap' THEN 2500
  WHEN 'career_track' THEN 100000
  ELSE price_credits END
WHERE action_key IN ('job_post','featured_job','unlock_contact','profile_boost','priority_application','cover_letter','cv_rewrite','skill_gap','career_track');

UPDATE public.career_tracks SET price_credits = 100000;