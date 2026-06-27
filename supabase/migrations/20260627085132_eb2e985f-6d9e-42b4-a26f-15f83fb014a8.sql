
DROP VIEW IF EXISTS public.v_active_unlocks CASCADE;

DROP FUNCTION IF EXISTS public.consume_delegate_token(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_delegate_token(text) CASCADE;

DROP TABLE IF EXISTS public.delegate_tokens CASCADE;
DROP TABLE IF EXISTS public.ai_rate_limits CASCADE;
DROP TABLE IF EXISTS public.partner_tier_approvals CASCADE;
DROP TABLE IF EXISTS public.partner_statement_revisions CASCADE;
DROP TABLE IF EXISTS public.mentor_session_escrow CASCADE;
DROP TABLE IF EXISTS public.career_track_enrollments CASCADE;
DROP TABLE IF EXISTS public.career_tracks CASCADE;
