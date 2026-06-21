CREATE OR REPLACE FUNCTION public.get_user_contacts_admin(_ids uuid[])
 RETURNS TABLE(id uuid, email text, phone text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'moderator'::app_role)
          OR public.has_role(auth.uid(), 'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.phone
    FROM public.profiles p
    WHERE p.id = ANY(_ids);
END;
$function$;