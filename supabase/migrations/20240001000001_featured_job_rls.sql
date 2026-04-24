-- Prevent non-Pro employers from setting is_featured = true
CREATE POLICY "only_pro_can_feature_jobs" ON jobs
FOR UPDATE USING (
  is_featured = false
  OR EXISTS (
    SELECT 1 FROM employer_profiles ep
    WHERE ep.user_id = auth.uid()
    AND ep.subscription_plan = 'pro'
    AND (ep.subscription_expires_at IS NULL OR ep.subscription_expires_at > now())
  )
);
