-- Enable pg_net for async HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper: read service role key from vault
CREATE OR REPLACE FUNCTION public._get_service_role_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;
$$;

-- Trigger function: invoke parse-cv via pg_net
CREATE OR REPLACE FUNCTION public.trigger_parse_cv()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_path text;
  v_key text;
  v_url text := 'https://dbnyhtvpnzsleeqnmggc.supabase.co/functions/v1/parse-cv';
BEGIN
  -- Extract storage path from file_url (everything after /cv-documents/)
  IF NEW.file_url IS NULL OR NEW.file_url = '' THEN
    RETURN NEW;
  END IF;

  IF position('/cv-documents/' in NEW.file_url) > 0 THEN
    v_path := split_part(NEW.file_url, '/cv-documents/', 2);
  ELSE
    v_path := NEW.file_url; -- already a relative path
  END IF;

  IF v_path IS NULL OR v_path = '' THEN
    RETURN NEW;
  END IF;

  v_key := public._get_service_role_key();
  IF v_key IS NULL THEN
    RAISE WARNING 'parse-cv trigger: service_role_key not seeded in vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'file_path', v_path,
      'user_id', NEW.user_id::text
    ),
    timeout_milliseconds := 120000
  );

  RETURN NEW;
END;
$$;

-- Drop & recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_parse_cv_on_insert ON public.cv_documents;
CREATE TRIGGER trg_parse_cv_on_insert
AFTER INSERT ON public.cv_documents
FOR EACH ROW
EXECUTE FUNCTION public.trigger_parse_cv();

DROP TRIGGER IF EXISTS trg_parse_cv_on_update ON public.cv_documents;
CREATE TRIGGER trg_parse_cv_on_update
AFTER UPDATE OF file_url ON public.cv_documents
FOR EACH ROW
WHEN (OLD.file_url IS DISTINCT FROM NEW.file_url)
EXECUTE FUNCTION public.trigger_parse_cv();