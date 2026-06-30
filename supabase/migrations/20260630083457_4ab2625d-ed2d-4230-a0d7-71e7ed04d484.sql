GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_payment_requests TO authenticated;
GRANT ALL ON public.subscription_payment_requests TO service_role;

DROP POLICY IF EXISTS "Users can view own payment reqs" ON public.subscription_payment_requests;
DROP POLICY IF EXISTS "Admins can view all payment reqs" ON public.subscription_payment_requests;
DROP POLICY IF EXISTS "Admins can review payment reqs" ON public.subscription_payment_requests;

CREATE POLICY "Users can view own payment reqs"
ON public.subscription_payment_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment reqs"
ON public.subscription_payment_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can review payment reqs"
ON public.subscription_payment_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));