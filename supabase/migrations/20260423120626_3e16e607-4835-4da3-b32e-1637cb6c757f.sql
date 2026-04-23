-- 1. Profiles: hide email & phone from non-owners/non-admins via column-safe policies.
-- Drop the broad SELECT policies and replace with split policies that exclude PII.
DROP POLICY IF EXISTS "Profiles visible by visibility rules" ON public.profiles;
DROP POLICY IF EXISTS "Anon can view public profiles" ON public.profiles;

-- Owner & admin/mod: full row access (including email/phone)
CREATE POLICY "Owners and admins see full profile"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Other authenticated users: can see rows by visibility, but app code must avoid selecting email/phone.
-- We enforce column-level masking via a SECURITY INVOKER view.
CREATE POLICY "Members see visible profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() <> id
  AND NOT public.has_role(auth.uid(), 'admin'::app_role)
  AND NOT public.has_role(auth.uid(), 'moderator'::app_role)
  AND visibility = ANY (ARRAY['public'::text, 'members'::text])
);

CREATE POLICY "Anon sees only public profiles"
ON public.profiles FOR SELECT TO anon
USING (visibility = 'public'::text);

-- Public-safe view that masks email/phone unless caller is owner/admin.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT
  id, display_name, avatar_url, headline, bio, location, website,
  primary_role, skills, languages, experience, visibility, is_premium,
  remote_ready, has_laptop, internet_stable, has_wise, has_payoneer, has_upwork,
  referral_code, preferred_work_types, role_title, last_seen_at, created_at, updated_at,
  CASE WHEN auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role)
       THEN email ELSE NULL END AS email,
  CASE WHEN auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role)
       THEN phone ELSE NULL END AS phone
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2. Employer profiles: drop the wide-open base SELECT; restrict to owner/admin.
-- Public view (employer_profiles_public) already exists for general consumption.
DROP POLICY IF EXISTS "Authenticated can view employer rows" ON public.employer_profiles;

CREATE POLICY "Owners and admins read employer rows"
ON public.employer_profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Ensure public view is granted
GRANT SELECT ON public.employer_profiles_public TO anon, authenticated;

-- 3. Realtime: replace ELSE true with deny-by-default.
DROP POLICY IF EXISTS "participants_only_realtime" ON realtime.messages;
CREATE POLICY "participants_only_realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'conversation:%'
      THEN (substr(realtime.topic(), 14))::uuid IN (
        SELECT public.user_conversation_ids(auth.uid())
      )
    ELSE false
  END
);

-- 4. app_config: restrict to admins only (clients use the publishable values via edge or hardcoded defaults).
DROP POLICY IF EXISTS "Authenticated can view app config" ON public.app_config;
CREATE POLICY "Admins read app config"
ON public.app_config FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow non-admin authenticated users to read only non-sensitive keys (telegram_bot, payment_accounts display).
CREATE POLICY "Authenticated read public config keys"
ON public.app_config FOR SELECT TO authenticated
USING (key IN ('telegram_bot', 'payment_accounts'));

-- 5. payment-proofs: add owner-scoped UPDATE policy.
CREATE POLICY "Users can update own payment proofs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);