CREATE OR REPLACE FUNCTION public.sync_job_primary_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.categories IS NOT NULL AND cardinality(NEW.categories) > 0 THEN
    NEW.category := NEW.categories[1];
  ELSIF NEW.category IS NOT NULL AND NEW.category <> '' THEN
    NEW.categories := ARRAY[NEW.category];
  END IF;
  RETURN NEW;
END;
$$;