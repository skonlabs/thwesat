DO $$
DECLARE
  v_conv_id uuid := gen_random_uuid();
  v_sender uuid := '112e4a7d-905e-40c4-8916-3a0a8a85f293';
  v_recipient uuid := 'cf042cc5-8b21-4af5-91f7-a68502c28ab1';
BEGIN
  INSERT INTO public.conversations (id, last_message_at) VALUES (v_conv_id, now());
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (v_conv_id, v_sender), (v_conv_id, v_recipient);
  INSERT INTO public.messages (conversation_id, sender_id, content, is_read)
    VALUES (v_conv_id, v_sender, 'Hello test2! This is a read-flow QA message.', false);
END $$;