
REVOKE EXECUTE ON FUNCTION public._wallet_apply(uuid,bigint,bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wallet_topup_approve(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wallet_topup_reject(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wallet_spend(text,text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wallet_adjust(uuid,bigint,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wallet_refund_transaction(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mentor_book_with_credits(uuid,bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mentor_session_release(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mentor_session_refund(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_wallet() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.wallet_topup_approve(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_topup_reject(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_spend(text,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_adjust(uuid,bigint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_refund_transaction(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_book_with_credits(uuid,bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_session_release(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_session_refund(uuid,text) TO authenticated;
