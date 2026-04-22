ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill categories from the existing single category column for existing rows
UPDATE public.jobs
SET categories = ARRAY[category]
WHERE category IS NOT NULL
  AND category <> ''
  AND (categories IS NULL OR cardinality(categories) = 0);

-- Trigger to keep `category` (single) in sync with the first item of `categories` (array),
-- so older code paths still see a value.
CREATE OR REPLACE FUNCTION public.sync_job_primary_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.categories IS NOT NULL AND cardinality(NEW.categories) > 0 THEN
    NEW.category := NEW.categories[1];
  ELSIF NEW.category IS NOT NULL AND NEW.category <> '' THEN
    -- If only the legacy field was set, mirror it into categories
    NEW.categories := ARRAY[NEW.category];
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_job_primary_category_trg ON public.jobs;
CREATE TRIGGER sync_job_primary_category_trg
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.sync_job_primary_category();