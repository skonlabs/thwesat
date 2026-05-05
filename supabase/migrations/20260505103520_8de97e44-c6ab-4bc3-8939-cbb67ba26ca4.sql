DELETE FROM public.mentor_bookings WHERE topic ILIKE 'E2E%';
DELETE FROM auth.users WHERE email = 'test-agent-audit@thwesone.app';