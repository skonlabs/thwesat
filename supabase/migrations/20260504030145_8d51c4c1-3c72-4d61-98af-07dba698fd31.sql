-- Revoke EXECUTE on internal trigger/utility functions from anon and authenticated.
-- These should only run as triggers or via service_role.
DO $$
DECLARE
  fn record;
  keep_list text[] := ARRAY[
    'has_role',
    'get_my_contact_info',
    'review_payment_request',
    'user_conversation_ids',
    'validate_delegate_token'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname <> ALL (keep_list)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;',
      fn.proname, fn.args
    );
  END LOOP;
END $$;

-- Enable leaked-password protection cannot be done in SQL; documented for the user.