
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS fk_sub_plan;
ALTER TABLE public.addon_purchases DROP CONSTRAINT IF EXISTS fk_ap_addon;
ALTER TABLE public.subscription_payment_requests DROP CONSTRAINT IF EXISTS fk_spr_plan;
ALTER TABLE public.subscription_payment_requests DROP CONSTRAINT IF EXISTS fk_spr_addon;
