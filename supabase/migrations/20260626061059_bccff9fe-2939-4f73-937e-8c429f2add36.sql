
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name='profiles'
    AND column_name NOT IN ('email','phone');
  EXECUTE 'REVOKE SELECT ON public.profiles FROM anon';
  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO anon', cols);
END $$;
