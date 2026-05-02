-- 1. Profile email/phone column-level lockdown
REVOKE SELECT (email, phone) ON public.profiles FROM authenticated;
REVOKE SELECT (email, phone) ON public.profiles FROM anon;

GRANT SELECT (
  id, display_name, avatar_url, headline, bio, location, website,
  primary_role, skills, languages, experience, is_premium, remote_ready,
  created_at, updated_at, role_title, preferred_work_types,
  has_payoneer, has_wise, has_upwork, has_laptop, internet_stable,
  referral_code, referred_by, last_seen_at, deletion_scheduled_at,
  deletion_requested_at, visibility
) ON public.profiles TO authenticated;

GRANT SELECT (
  id, display_name, avatar_url, headline, bio, location, website,
  primary_role, skills, languages, experience, is_premium, remote_ready,
  created_at, updated_at, role_title, preferred_work_types, visibility
) ON public.profiles TO anon;

CREATE OR REPLACE FUNCTION public.get_my_contact_info()
RETURNS TABLE(email text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email, phone FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_contact_info() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_contact_info() TO authenticated;

-- 2. Storage bucket listing lockdown
DROP POLICY IF EXISTS "Avatars readable by path" ON storage.objects;
CREATE POLICY "Avatar owners can list own folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Post images are publicly viewable" ON storage.objects;
CREATE POLICY "Post image owners can list own folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 3. Revoke EXECUTE on trigger-only / server-only SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  trigger_only_fns text[] := ARRAY[
    'handle_new_user()',
    'handle_new_user_role()',
    'handle_new_user_settings()',
    'sync_job_primary_category()',
    'sync_applicant_count()',
    'sync_slot_booked_status()',
    'sync_profile_premium()',
    'guard_delete_booked_slot()',
    'ensure_job_company()',
    'generate_referral_code()',
    'create_placement_fee_invoice()',
    'log_application_status_change()',
    'log_job_status_change()',
    'on_referral_completed()',
    'update_conversation_last_message()',
    'update_updated_at()',
    'increment_applicant_count()',
    'process_referral_reward(uuid)',
    'expire_referral_premium()',
    'set_user_role(uuid, app_role)'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_only_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Function public.% does not exist, skipping', fn;
    END;
  END LOOP;
END $$;
