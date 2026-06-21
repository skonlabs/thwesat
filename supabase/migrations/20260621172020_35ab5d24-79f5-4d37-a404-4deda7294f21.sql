REVOKE EXECUTE ON FUNCTION public.wallet_spend(text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_spend(text, text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_subscription_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_subscription_payment(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_subscription_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_subscription_payment(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_mark_partner_statement_paid(uuid, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_partner_statement_paid(uuid, integer, integer, text) TO authenticated;

DROP POLICY IF EXISTS "Users can cancel own pending reqs" ON public.subscription_payment_requests;
CREATE POLICY "Users can cancel own pending reqs"
ON public.subscription_payment_requests
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');