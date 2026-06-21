CREATE OR REPLACE FUNCTION public.notify_staff_on_topup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'User') INTO v_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, title, title_my, description, description_my, notification_type, link_path)
  SELECT
    ur.user_id,
    'New top-up awaiting review',
    'ငွေဖြည့်တောင်းခံမှု စစ်ဆေးရန်',
    COALESCE(v_name, 'User') || ' submitted a top-up of ' || NEW.mmk_amount::text || ' MMK',
    COALESCE(v_name, 'User') || ' မှ ' || NEW.mmk_amount::text || ' MMK ငွေဖြည့်တောင်းခံပါသည်',
    'payment',
    CASE WHEN ur.role = 'partner'::public.app_role THEN '/partner/wallet' ELSE '/admin/wallet' END
  FROM public.user_roles ur
  WHERE ur.role IN ('admin'::public.app_role, 'partner'::public.app_role);

  RETURN NEW;
END;
$function$;

UPDATE public.notifications n
SET link_path = '/partner/wallet'
FROM public.user_roles ur
WHERE n.user_id = ur.user_id
  AND ur.role = 'partner'::public.app_role
  AND n.notification_type = 'payment'
  AND n.title = 'New top-up awaiting review'
  AND n.link_path = '/admin/wallet';

UPDATE public.notifications n
SET link_path = '/admin/wallet'
FROM public.user_roles ur
WHERE n.user_id = ur.user_id
  AND ur.role = 'admin'::public.app_role
  AND n.notification_type = 'payment'
  AND n.title = 'New top-up awaiting review'
  AND (n.link_path IS NULL OR n.link_path <> '/admin/wallet');

INSERT INTO public.notifications (user_id, title, title_my, description, description_my, notification_type, link_path)
SELECT
  ur.user_id,
  'New top-up awaiting review',
  'ငွေဖြည့်တောင်းခံမှု စစ်ဆေးရန်',
  COALESCE(p.display_name, 'User') || ' submitted a top-up of ' || tr.mmk_amount::text || ' MMK',
  COALESCE(p.display_name, 'User') || ' မှ ' || tr.mmk_amount::text || ' MMK ငွေဖြည့်တောင်းခံပါသည်',
  'payment',
  CASE WHEN ur.role = 'partner'::public.app_role THEN '/partner/wallet' ELSE '/admin/wallet' END
FROM public.topup_requests tr
JOIN public.user_roles ur ON ur.role IN ('admin'::public.app_role, 'partner'::public.app_role)
LEFT JOIN public.profiles p ON p.id = tr.user_id
WHERE tr.status = 'pending'
  AND NOT EXISTS (
    SELECT 1
    FROM public.notifications existing
    WHERE existing.user_id = ur.user_id
      AND existing.notification_type = 'payment'
      AND existing.title = 'New top-up awaiting review'
      AND existing.description = COALESCE(p.display_name, 'User') || ' submitted a top-up of ' || tr.mmk_amount::text || ' MMK'
  );