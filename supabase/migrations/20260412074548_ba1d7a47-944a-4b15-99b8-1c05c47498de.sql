
-- Drop the broken INSERT policy on conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a new INSERT policy that doesn't reference auth.users
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);
