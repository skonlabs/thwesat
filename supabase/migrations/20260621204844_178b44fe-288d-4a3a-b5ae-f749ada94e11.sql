CREATE POLICY "Partners read payment requests"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'partner'::public.app_role));

CREATE OR REPLACE FUNCTION public.notify_staff_on_payment_request_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_type text;
BEGIN
  IF NEW.status <> 'pending' OR NEW.proof_url IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.proof_url IS NOT DISTINCT FROM NEW.proof_url THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'User') INTO v_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  v_type := CASE NEW.payment_type
    WHEN 'placement_fee' THEN 'placement fee'
    WHEN 'mentor_session' THEN 'mentor session'
    ELSE COALESCE(NEW.payment_type, 'payment')
  END;

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
    'New payment awaiting review',
    'ငွေပေးချေမှု စစ်ဆေးရန်',
    COALESCE(v_name, 'User') || ' submitted proof for a ' || v_type || ' payment of ' || NEW.amount::text || ' ' || COALESCE(NEW.currency, 'MMK'),
    COALESCE(v_name, 'User') || ' မှ ' || NEW.amount::text || ' ' || COALESCE(NEW.currency, 'MMK') || ' ငွေပေးချေမှု အထောက်အထား တင်သွင်းပါသည်',
    'payment',
    CASE WHEN ur.role = 'partner'::public.app_role THEN '/partner/wallet?tab=topups' ELSE '/admin/wallet?tab=topups' END
  FROM public.user_roles ur
  WHERE ur.role IN ('admin'::public.app_role, 'partner'::public.app_role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_payment_request_insert ON public.payment_requests;
CREATE TRIGGER trg_notify_staff_on_payment_request_insert
AFTER INSERT ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_payment_request_review();

DROP TRIGGER IF EXISTS trg_notify_staff_on_payment_request_proof ON public.payment_requests;
CREATE TRIGGER trg_notify_staff_on_payment_request_proof
AFTER UPDATE OF proof_url ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_payment_request_review();