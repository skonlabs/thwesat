
-- Fix permissive INSERT policies on conversations and participants
DROP POLICY "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY "Users can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add participants" ON public.conversation_participants
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid())
  );
