
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled_at
  ON public.profiles (deletion_scheduled_at)
  WHERE deletion_scheduled_at IS NOT NULL;

-- Allow a signed-in user to cancel their own pending deletion
-- (already covered by "Users can update own profile" RLS policy)
