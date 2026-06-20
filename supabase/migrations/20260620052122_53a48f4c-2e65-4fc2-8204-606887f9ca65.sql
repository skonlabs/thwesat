
-- Add missing foreign key constraints so PostgREST embedded-resource joins work
ALTER TABLE public.subscription_payment_requests
  ADD CONSTRAINT fk_spr_plan FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_spr_addon FOREIGN KEY (addon_id) REFERENCES public.addon_products(id) ON DELETE SET NULL;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;

ALTER TABLE public.addon_purchases
  ADD CONSTRAINT fk_ap_addon FOREIGN KEY (addon_id) REFERENCES public.addon_products(id) ON DELETE CASCADE;

-- (No table created; only altering existing tables with FKs)
