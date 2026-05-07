ALTER TABLE public.user_settings ALTER COLUMN session_expiry SET DEFAULT '7d';
UPDATE public.user_settings SET session_expiry = '7d' WHERE session_expiry = '24h';