ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS full_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS vision text DEFAULT '',
  ADD COLUMN IF NOT EXISTS mission text DEFAULT '',
  ADD COLUMN IF NOT EXISTS what_we_do text DEFAULT '',
  ADD COLUMN IF NOT EXISTS benefits text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text DEFAULT '';