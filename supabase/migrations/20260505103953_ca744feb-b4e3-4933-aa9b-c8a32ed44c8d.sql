-- Convert all USD amounts to MMK at 4500 rate, then standardize defaults to MMK only.

-- Jobs: convert USD salary to MMK (rounded to nearest 1000)
UPDATE public.jobs
SET salary_min = CASE WHEN salary_min IS NOT NULL THEN ROUND((salary_min * 4500)::numeric / 1000) * 1000 ELSE NULL END,
    salary_max = CASE WHEN salary_max IS NOT NULL THEN ROUND((salary_max * 4500)::numeric / 1000) * 1000 ELSE NULL END,
    currency = 'MMK'
WHERE COALESCE(currency, 'USD') <> 'MMK';

ALTER TABLE public.jobs ALTER COLUMN currency SET DEFAULT 'MMK';

-- Mentor profiles: convert hourly_rate USD → MMK
UPDATE public.mentor_profiles
SET hourly_rate = CASE WHEN hourly_rate IS NOT NULL AND hourly_rate > 0
                       THEN ROUND((hourly_rate * 4500)::numeric / 1000) * 1000
                       ELSE hourly_rate END,
    currency = 'MMK'
WHERE COALESCE(currency, 'USD') <> 'MMK';

ALTER TABLE public.mentor_profiles ALTER COLUMN currency SET DEFAULT 'MMK';

-- Mentor earnings: convert
UPDATE public.mentor_earnings
SET amount = CASE WHEN currency = 'USD' THEN ROUND(amount * 4500) ELSE amount END,
    currency = 'MMK'
WHERE currency NOT IN ('MMK','CREDITS');

ALTER TABLE public.mentor_earnings ALTER COLUMN currency SET DEFAULT 'MMK';

-- Payment requests: convert USD → MMK
UPDATE public.payment_requests
SET amount = CASE WHEN currency = 'USD' THEN ROUND(amount * 4500) ELSE amount END,
    currency = 'MMK'
WHERE currency <> 'MMK';

ALTER TABLE public.payment_requests ALTER COLUMN currency SET DEFAULT 'MMK';

-- Update placement fee invoice trigger function to use MMK default
CREATE OR REPLACE FUNCTION public.create_placement_fee_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_employer_id uuid;
  v_currency text;
  v_existing uuid;
BEGIN
  IF NEW.status = 'placed'
     AND NEW.placement_fee IS NOT NULL
     AND NEW.placement_fee > 0
     AND (OLD.status IS DISTINCT FROM 'placed' OR OLD.placement_fee IS DISTINCT FROM NEW.placement_fee)
  THEN
    SELECT employer_id, COALESCE(currency, 'MMK') INTO v_employer_id, v_currency
      FROM public.jobs WHERE id = NEW.job_id;

    IF v_employer_id IS NULL THEN RETURN NEW; END IF;

    SELECT id INTO v_existing
      FROM public.payment_requests
      WHERE payment_type = 'placement_fee'
        AND reference_id = NEW.id::text
      LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN NEW; END IF;

    INSERT INTO public.payment_requests (
      user_id, payment_type, payment_method, amount, currency,
      reference_id, status
    ) VALUES (
      v_employer_id, 'placement_fee', 'kbzpay', NEW.placement_fee, v_currency,
      NEW.id::text, 'pending'
    );

    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (
      v_employer_id, 'payment',
      'Placement Fee Invoice', 'ခန့်အပ်ခ ငွေတောင်းခံလွှာ',
      'A placement fee of ' || NEW.placement_fee || ' ' || v_currency || ' is due. Please submit payment proof.',
      'ခန့်အပ်ခ ' || NEW.placement_fee || ' ' || v_currency || ' ပေးချေရန် ရှိပါသည်။',
      '/employer/finance'
    );
  END IF;
  RETURN NEW;
END;
$function$;