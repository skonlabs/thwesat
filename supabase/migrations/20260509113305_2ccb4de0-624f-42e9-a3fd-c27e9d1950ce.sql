ALTER TABLE public.cv_documents
  ADD COLUMN IF NOT EXISTS parsed_text text,
  ADD COLUMN IF NOT EXISTS parsed_data jsonb,
  ADD COLUMN IF NOT EXISTS parsed_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS cv_documents_user_id_idx ON public.cv_documents(user_id);