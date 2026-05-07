REVOKE EXECUTE ON FUNCTION public.is_employer_or_agent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_employer_or_agent(uuid) TO authenticated;