
-- Drop all existing policies on conversation_participants
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view own participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;

-- Non-recursive SELECT: user can see participants of conversations they belong to
-- Use a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.user_conversation_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = _user_id
$$;

-- SELECT: see rows in conversations you belong to
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (conversation_id IN (SELECT public.user_conversation_ids(auth.uid())));

-- INSERT: can add self, or add others to conversations you're already in
CREATE POLICY "Users can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR conversation_id IN (SELECT public.user_conversation_ids(auth.uid()))
);
