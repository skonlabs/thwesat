
-- Delete guides added after original seed (keep only the 6 from 2026-04-01 04:44:13)
DELETE FROM public.guide_feedback;
DELETE FROM public.guides WHERE created_at > '2026-04-01 04:44:14+00';

-- Delete all mentor bookings (not in original seed)
DELETE FROM public.mentor_bookings;

-- Delete all payment requests (not in original seed)
DELETE FROM public.payment_requests;

-- Delete applications added after original seed (keep 2 from seed)
DELETE FROM public.applications WHERE created_at > '2026-04-01 04:44:14+00';

-- Delete community posts added after original seed (keep 4 from seed)
DELETE FROM public.post_comments;
DELETE FROM public.post_likes;
DELETE FROM public.post_saves;
DELETE FROM public.community_posts WHERE created_at > '2026-04-01 04:44:14+00';

-- Delete mentor profiles added after original seed (keep original one: 34bb0894)
DELETE FROM public.mentor_availability_slots WHERE mentor_id != '34bb0894-953a-41ba-8043-d036bf753663';
DELETE FROM public.mentor_availability_slots;
DELETE FROM public.mentor_earnings;
DELETE FROM public.mentor_mentees;
DELETE FROM public.mentor_reviews;
DELETE FROM public.mentor_profiles WHERE id != '34bb0894-953a-41ba-8043-d036bf753663';

-- Delete all CV documents and generated documents (not in original seed)
DELETE FROM public.cv_documents;
DELETE FROM public.generated_documents;

-- Delete saved jobs added after original seed
DELETE FROM public.saved_jobs WHERE created_at > '2026-04-01 04:44:14+00';

-- Delete all notifications
DELETE FROM public.notifications;

-- Delete all subscriptions (test data)
DELETE FROM public.subscriptions;
