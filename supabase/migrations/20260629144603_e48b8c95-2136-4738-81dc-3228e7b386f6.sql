
CREATE POLICY "Users read own wallet"
  ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         OR public.has_role(auth.uid(),'admin'::app_role)
         OR public.has_role(auth.uid(),'partner'::app_role));

CREATE POLICY "Users read own wallet tx"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         OR public.has_role(auth.uid(),'admin'::app_role)
         OR public.has_role(auth.uid(),'partner'::app_role));
