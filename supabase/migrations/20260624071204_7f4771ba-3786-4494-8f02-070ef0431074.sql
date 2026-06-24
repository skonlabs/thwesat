-- ============================================================
-- Batch B + D server-side hardening
-- ============================================================

-- 1. Prevent double-booking same mentor/date/time across active statuses.
--    Allows multiple cancelled/declined rows, blocks pending/confirmed/completed overlap.
CREATE OR REPLACE FUNCTION public.mentor_bookings_prevent_double_book()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('pending','confirmed','completed') AND NEW.scheduled_time IS NOT NULL
     AND NEW.scheduled_time <> 'TBD' THEN
    IF EXISTS (
      SELECT 1 FROM public.mentor_bookings b
      WHERE b.mentor_id = NEW.mentor_id
        AND b.scheduled_date = NEW.scheduled_date
        AND b.scheduled_time = NEW.scheduled_time
        AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND b.status IN ('pending','confirmed','completed')
    ) THEN
      RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_bookings_prevent_double_book ON public.mentor_bookings;
CREATE TRIGGER trg_mentor_bookings_prevent_double_book
BEFORE INSERT OR UPDATE OF status, scheduled_date, scheduled_time
ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.mentor_bookings_prevent_double_book();

-- 2. Reconcile credits_charged on booking insert so client cannot under-pay.
--    Recomputes from mentor's hourly_rate × duration (fallback 5000 base if no rate).
CREATE OR REPLACE FUNCTION public.mentor_bookings_reconcile_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_expected integer;
BEGIN
  SELECT COALESCE(hourly_rate, 0) INTO v_rate
  FROM public.mentor_profiles WHERE user_id = NEW.mentor_id;

  IF v_rate > 0 AND NEW.duration_minutes IS NOT NULL THEN
    v_expected := ROUND(v_rate * NEW.duration_minutes / 60.0);
  ELSE
    v_expected := 5000;
  END IF;

  -- Always overwrite client-supplied value with server truth.
  NEW.credits_charged := v_expected;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_bookings_reconcile_credits ON public.mentor_bookings;
CREATE TRIGGER trg_mentor_bookings_reconcile_credits
BEFORE INSERT ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.mentor_bookings_reconcile_credits();

-- 3. AI rate-limit log — generic per-user/per-action daily counter for edge functions.
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id uuid NOT NULL,
  action text NOT NULL,
  day_bucket date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action, day_bucket)
);

GRANT SELECT ON public.ai_rate_limits TO authenticated;
GRANT ALL ON public.ai_rate_limits TO service_role;

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_rate_limits_own_select" ON public.ai_rate_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Atomic increment + cap check used by edge functions.
CREATE OR REPLACE FUNCTION public.ai_rate_limit_check_and_increment(
  _user_id uuid,
  _action text,
  _daily_cap integer
)
RETURNS TABLE (allowed boolean, current_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  INSERT INTO public.ai_rate_limits (user_id, action, day_bucket, count)
  VALUES (_user_id, _action, v_today, 1)
  ON CONFLICT (user_id, action, day_bucket)
  DO UPDATE SET count = public.ai_rate_limits.count + 1, updated_at = now()
  RETURNING count INTO v_count;

  IF v_count > _daily_cap THEN
    -- Roll back the increment so accurate count is preserved.
    UPDATE public.ai_rate_limits
       SET count = count - 1, updated_at = now()
     WHERE user_id = _user_id AND action = _action AND day_bucket = v_today;
    RETURN QUERY SELECT false, _daily_cap;
  ELSE
    RETURN QUERY SELECT true, v_count;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_rate_limit_check_and_increment(uuid, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.ai_rate_limit_check_and_increment(uuid, text, integer) TO service_role;