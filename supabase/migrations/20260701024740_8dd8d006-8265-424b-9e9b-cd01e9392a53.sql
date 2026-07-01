
-- Add missing RLS policies so users can see their own subscription grants and quotas.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_quotas' AND policyname='sq_self_read') THEN
    CREATE POLICY sq_self_read ON public.subscription_quotas FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='subs_self_read') THEN
    CREATE POLICY subs_self_read ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

GRANT SELECT ON public.subscription_quotas TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscription_quotas TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
