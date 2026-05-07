ALTER TABLE public.delegate_tokens
  ADD COLUMN IF NOT EXISTS used_at timestamptz,
  ADD COLUMN IF NOT EXISTS used_by_session text;

CREATE OR REPLACE FUNCTION public.consume_delegate_token(_token text, _session_id text)
RETURNS TABLE(permissions text[], expires_at timestamptz, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.delegate_tokens%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.delegate_tokens WHERE token = _token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::text[], NULL::timestamptz, 'invalid'::text;
    RETURN;
  END IF;

  IF _row.is_revoked THEN
    RETURN QUERY SELECT NULL::text[], NULL::timestamptz, 'revoked'::text;
    RETURN;
  END IF;

  IF _row.expires_at < now() THEN
    RETURN QUERY SELECT NULL::text[], NULL::timestamptz, 'expired'::text;
    RETURN;
  END IF;

  -- Already used by a different session => reject
  IF _row.used_at IS NOT NULL AND _row.used_by_session IS DISTINCT FROM _session_id THEN
    RETURN QUERY SELECT NULL::text[], NULL::timestamptz, 'already_used'::text;
    RETURN;
  END IF;

  -- First use OR same session re-opening: claim/refresh
  IF _row.used_at IS NULL THEN
    UPDATE public.delegate_tokens
       SET used_at = now(), used_by_session = _session_id
     WHERE id = _row.id;
  END IF;

  RETURN QUERY SELECT _row.permissions, _row.expires_at, 'ok'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_delegate_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_delegate_token(text, text) TO anon, authenticated;