-- Fix notify_staff_on_topup_request: notification_type must be in the allowed set ('payment' instead of 'payment_review').
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
    '/admin/wallet'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'partner');

  RETURN NEW;
END;
$function$;

-- Backfill notifications for any currently pending top-ups
INSERT INTO public.notifications (user_id, title, title_my, description, description_my, notification_type, link_path)
SELECT
  ur.user_id,
  'New top-up awaiting review',
  'ငွေဖြည့်တောင်းခံမှု စစ်ဆေးရန်',
  COALESCE(p.display_name, 'User') || ' submitted a top-up of ' || tr.mmk_amount::text || ' MMK',
  COALESCE(p.display_name, 'User') || ' မှ ' || tr.mmk_amount::text || ' MMK ငွေဖြည့်တောင်းခံပါသည်',
  'payment',
  '/admin/wallet'
FROM public.topup_requests tr
LEFT JOIN public.profiles p ON p.id = tr.user_id
CROSS JOIN public.user_roles ur
WHERE tr.status = 'pending'
  AND ur.role IN ('admin','partner');