CREATE OR REPLACE FUNCTION delete_user_cascade(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM mentor_bookings WHERE mentor_id = target_user_id OR mentee_id = target_user_id;
  DELETE FROM job_applications WHERE applicant_id = target_user_id;
  DELETE FROM saved_jobs WHERE user_id = target_user_id;
  DELETE FROM jobs WHERE posted_by = target_user_id;
  DELETE FROM employer_profiles WHERE user_id = target_user_id;
  DELETE FROM mentor_profiles WHERE user_id = target_user_id;
  DELETE FROM payment_requests WHERE user_id = target_user_id;
  DELETE FROM notifications WHERE user_id = target_user_id;
  DELETE FROM messages WHERE sender_id = target_user_id;
  DELETE FROM community_posts WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE id = target_user_id;
END;
$$;
