
GRANT EXECUTE ON FUNCTION public.get_my_contact_info() TO anon, authenticated, service_role;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_user_contacts_admin') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_contacts_admin(uuid[]) TO authenticated, service_role';
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
