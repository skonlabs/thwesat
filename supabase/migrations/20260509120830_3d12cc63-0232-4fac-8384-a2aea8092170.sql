-- Toggle file_url to force trg_parse_cv_on_update to fire
UPDATE public.cv_documents SET file_url = file_url || '#r' WHERE parsed_at IS NULL AND file_url IS NOT NULL;
UPDATE public.cv_documents SET file_url = replace(file_url, '#r', '') WHERE parsed_at IS NULL AND file_url LIKE '%#r';