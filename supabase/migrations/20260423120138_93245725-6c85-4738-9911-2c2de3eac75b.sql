-- Security hardening migration (idempotent retry)

-- 1. PROFILES
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles visible by visibility rules" ON public.profiles;
DROP POLICY IF EXISTS "Anon can view public profiles" ON public.profiles;

CREATE POLICY "Profiles visible by visibility rules"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR visibility IN ('public', 'members')
);

CREATE POLICY "Anon can view public profiles"
ON public.profiles FOR SELECT TO anon
USING (visibility = 'public');

-- 2. EMPLOYER_PROFILES
DROP POLICY IF EXISTS "Anyone can view employer profiles" ON public.employer_profiles;
DROP POLICY IF EXISTS "Authenticated can view employer rows" ON public.employer_profiles;

CREATE POLICY "Authenticated can view employer rows"
ON public.employer_profiles FOR SELECT TO authenticated
USING (true);

CREATE OR REPLACE VIEW public.employer_profiles_public
WITH (security_invoker = true) AS
SELECT
  id, company_name, company_description, company_website, company_linkedin,
  industry, company_size, hq_country, payment_methods,
  is_verified, verification_status, created_at, updated_at,
  CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
       THEN contact_name ELSE NULL END AS contact_name,
  CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
       THEN contact_email ELSE NULL END AS contact_email,
  CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
       THEN contact_phone ELSE NULL END AS contact_phone,
  CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
       THEN subscription_tier ELSE NULL END AS subscription_tier,
  CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
       THEN subscription_expires_at ELSE NULL END AS subscription_expires_at
FROM public.employer_profiles;

GRANT SELECT ON public.employer_profiles_public TO authenticated, anon;

-- 3. DELEGATE_TOKENS
DROP POLICY IF EXISTS "Anyone can validate tokens" ON public.delegate_tokens;

CREATE OR REPLACE FUNCTION public.validate_delegate_token(_token text)
RETURNS TABLE(owner_id uuid, permissions text[], expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT owner_id, permissions, expires_at
  FROM public.delegate_tokens
  WHERE token = _token AND is_revoked = false AND expires_at > now()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.validate_delegate_token(text) TO anon, authenticated;

-- 4. NOTIFICATIONS
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5. SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.subscriptions;

CREATE POLICY "Admins can insert subscriptions"
ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subscriptions"
ON public.subscriptions FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. MENTOR_EARNINGS
DROP POLICY IF EXISTS "Mentors can insert own earnings" ON public.mentor_earnings;

-- 7. REALTIME messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'realtime' AND table_name = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "participants_only_realtime" ON realtime.messages';
    EXECUTE $POL$
      CREATE POLICY "participants_only_realtime"
      ON realtime.messages FOR SELECT TO authenticated
      USING (
        CASE WHEN realtime.topic() LIKE 'conversation:%' THEN
          (substr(realtime.topic(), 14))::uuid IN (SELECT public.user_conversation_ids(auth.uid()))
        ELSE true END
      )
    $POL$;
  END IF;
END $$;

-- 8. APP_CONFIG
DROP POLICY IF EXISTS "Anyone can view app config" ON public.app_config;
DROP POLICY IF EXISTS "Authenticated can view app config" ON public.app_config;

CREATE POLICY "Authenticated can view app config"
ON public.app_config FOR SELECT TO authenticated
USING (true);

-- 9. PAYMENT-PROOFS bucket
DROP POLICY IF EXISTS "Admins can delete payment proofs" ON storage.objects;
CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'::app_role));
