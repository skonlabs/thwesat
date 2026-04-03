
DO $$
DECLARE
  target_ids uuid[] := ARRAY[
    'e902b3b2-d018-4205-9a78-0348dc7c46b1',
    'b7eb4a18-d178-4740-b59e-f37c480b4559',
    '34bb0894-953a-41ba-8043-d036bf753663',
    '6041cdb1-1cdf-4dea-83ba-0f5b645d0420'
  ];
BEGIN
  -- Delete from child/dependent tables first
  DELETE FROM public.post_likes WHERE user_id = ANY(target_ids);
  DELETE FROM public.post_saves WHERE user_id = ANY(target_ids);
  DELETE FROM public.post_comments WHERE author_id = ANY(target_ids);
  DELETE FROM public.community_posts WHERE author_id = ANY(target_ids);
  DELETE FROM public.saved_jobs WHERE user_id = ANY(target_ids);
  DELETE FROM public.applications WHERE applicant_id = ANY(target_ids);
  DELETE FROM public.guide_feedback WHERE user_id = ANY(target_ids);
  DELETE FROM public.notifications WHERE user_id = ANY(target_ids);
  DELETE FROM public.payment_requests WHERE user_id = ANY(target_ids);
  DELETE FROM public.subscriptions WHERE user_id = ANY(target_ids);
  DELETE FROM public.cv_documents WHERE user_id = ANY(target_ids);
  DELETE FROM public.generated_documents WHERE user_id = ANY(target_ids);
  DELETE FROM public.delegate_tokens WHERE owner_id = ANY(target_ids);
  DELETE FROM public.scam_reports WHERE reporter_id = ANY(target_ids);
  DELETE FROM public.referrals WHERE referrer_id = ANY(target_ids);
  DELETE FROM public.mentor_earnings WHERE mentor_id = ANY(target_ids);
  DELETE FROM public.mentor_reviews WHERE reviewer_id = ANY(target_ids) OR mentor_id = ANY(target_ids);
  DELETE FROM public.mentor_bookings WHERE mentor_id = ANY(target_ids) OR mentee_id = ANY(target_ids);
  DELETE FROM public.mentor_mentees WHERE mentor_id = ANY(target_ids) OR mentee_id = ANY(target_ids);
  DELETE FROM public.mentor_availability_slots WHERE mentor_id = ANY(target_ids);
  DELETE FROM public.mentor_profiles WHERE id = ANY(target_ids);
  DELETE FROM public.employer_profiles WHERE id = ANY(target_ids);
  
  -- Delete messages in conversations they participate in
  DELETE FROM public.messages WHERE conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = ANY(target_ids)
  );
  DELETE FROM public.conversation_participants WHERE user_id = ANY(target_ids);
  -- Clean up empty conversations
  DELETE FROM public.conversations WHERE id NOT IN (
    SELECT DISTINCT conversation_id FROM public.conversation_participants
  );

  -- Delete user settings and roles
  DELETE FROM public.user_settings WHERE user_id = ANY(target_ids);
  DELETE FROM public.user_roles WHERE user_id = ANY(target_ids);
  
  -- Finally delete profiles
  DELETE FROM public.profiles WHERE id = ANY(target_ids);
END;
$$;
