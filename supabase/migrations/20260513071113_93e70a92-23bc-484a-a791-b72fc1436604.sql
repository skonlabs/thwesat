REVOKE EXECUTE ON FUNCTION public.is_user_onboarded(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_onboarded(uuid) TO authenticated;