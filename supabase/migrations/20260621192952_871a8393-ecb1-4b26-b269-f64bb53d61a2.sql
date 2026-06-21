
-- 1. Notify admins + partners on new top-up requests
CREATE OR REPLACE FUNCTION public.notify_staff_on_topup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'payment_review',
    '/admin/wallet'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'partner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_topup_request ON public.topup_requests;
CREATE TRIGGER trg_notify_staff_on_topup_request
AFTER INSERT ON public.topup_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_topup_request();

-- 2. Remove any existing moderator role assignments (role is being retired in UI/code)
DELETE FROM public.user_roles WHERE role = 'moderator';
