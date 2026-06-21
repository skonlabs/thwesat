CREATE POLICY "Partners read subscription payment reqs"
ON public.subscription_payment_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'partner'::public.app_role));

CREATE OR REPLACE FUNCTION public.notify_staff_on_subscription_payment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_item text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'User') INTO v_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF NEW.request_type = 'subscription' THEN
    SELECT 'package ' || COALESCE(sp.tier::text, 'subscription') INTO v_item
    FROM public.subscription_plans sp
    WHERE sp.id = NEW.plan_id;
  ELSE
    SELECT 'add-on ' || COALESCE(ap.label_en, ap.key, 'purchase') INTO v_item
    FROM public.addon_products ap
    WHERE ap.id = NEW.addon_id;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    title_my,
    description,
    description_my,
    notification_type,
    link_path
  )
  SELECT
    ur.user_id,
    'New package payment awaiting review',
    'Package ငွေပေးချေမှု စစ်ဆေးရန်',
    COALESCE(v_name, 'User') || ' submitted a ' || COALESCE(v_item, NEW.request_type) || ' payment of ' || NEW.mmk_amount::text || ' MMK',
    COALESCE(v_name, 'User') || ' မှ ' || NEW.mmk_amount::text || ' MMK package ငွေပေးချေမှု တင်သွင်းပါသည်',
    'payment',
    CASE WHEN ur.role = 'partner'::public.app_role THEN '/partner/wallet' ELSE '/admin/wallet' END
  FROM public.user_roles ur
  WHERE ur.role IN ('admin'::public.app_role, 'partner'::public.app_role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_subscription_payment_request ON public.subscription_payment_requests;
CREATE TRIGGER trg_notify_staff_on_subscription_payment_request
AFTER INSERT ON public.subscription_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_subscription_payment_request();