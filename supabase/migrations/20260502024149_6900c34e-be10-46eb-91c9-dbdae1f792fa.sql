
-- =========================================================
-- 1) Mentor availability slot ↔ booking sync
-- =========================================================

-- Unique constraint to prevent duplicate slots (issue #3)
CREATE UNIQUE INDEX IF NOT EXISTS mentor_availability_slots_unique_idx
  ON public.mentor_availability_slots (mentor_id, slot_date, start_time)
  WHERE slot_date IS NOT NULL;

-- Function: mark slot booked / unbooked based on booking state
CREATE OR REPLACE FUNCTION public.sync_slot_booked_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_states text[] := ARRAY['pending','confirmed'];
  v_inactive_states text[] := ARRAY['cancelled','declined','rejected','expired'];
BEGIN
  -- New booking with active status → flip slot to booked
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = ANY(v_active_states) THEN
      UPDATE public.mentor_availability_slots
        SET is_booked = true, updated_at = now()
      WHERE mentor_id = NEW.mentor_id
        AND slot_date = NEW.scheduled_date
        AND start_time = NEW.scheduled_time;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Status change to inactive → free the slot
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = ANY(v_inactive_states) AND OLD.status = ANY(v_active_states) THEN
        UPDATE public.mentor_availability_slots
          SET is_booked = false, updated_at = now()
        WHERE mentor_id = OLD.mentor_id
          AND slot_date = OLD.scheduled_date
          AND start_time = OLD.scheduled_time
          AND NOT EXISTS (
            SELECT 1 FROM public.mentor_bookings b2
            WHERE b2.mentor_id = OLD.mentor_id
              AND b2.scheduled_date = OLD.scheduled_date
              AND b2.scheduled_time = OLD.scheduled_time
              AND b2.id <> OLD.id
              AND b2.status = ANY(v_active_states)
          );
      ELSIF NEW.status = ANY(v_active_states) AND NOT (OLD.status = ANY(v_active_states)) THEN
        UPDATE public.mentor_availability_slots
          SET is_booked = true, updated_at = now()
        WHERE mentor_id = NEW.mentor_id
          AND slot_date = NEW.scheduled_date
          AND start_time = NEW.scheduled_time;
      END IF;
    END IF;
    -- If date/time changed, free old slot and book new one
    IF (OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date
        OR OLD.scheduled_time IS DISTINCT FROM NEW.scheduled_time)
       AND NEW.status = ANY(v_active_states) THEN
      UPDATE public.mentor_availability_slots
        SET is_booked = false, updated_at = now()
      WHERE mentor_id = OLD.mentor_id
        AND slot_date = OLD.scheduled_date
        AND start_time = OLD.scheduled_time;
      UPDATE public.mentor_availability_slots
        SET is_booked = true, updated_at = now()
      WHERE mentor_id = NEW.mentor_id
        AND slot_date = NEW.scheduled_date
        AND start_time = NEW.scheduled_time;
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_slot_booked_on_booking ON public.mentor_bookings;
CREATE TRIGGER sync_slot_booked_on_booking
AFTER INSERT OR UPDATE ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_slot_booked_status();

-- Block deletion of booked slots (issue #4)
CREATE OR REPLACE FUNCTION public.guard_delete_booked_slot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.is_booked = true THEN
    RAISE EXCEPTION 'cannot_delete_booked_slot: this slot has an active booking. Cancel the booking first.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_delete_booked_slot_trg ON public.mentor_availability_slots;
CREATE TRIGGER guard_delete_booked_slot_trg
BEFORE DELETE ON public.mentor_availability_slots
FOR EACH ROW EXECUTE FUNCTION public.guard_delete_booked_slot();

-- =========================================================
-- 2) Mentor reviews: require a real booking (issue #2)
-- =========================================================

DROP POLICY IF EXISTS "Users can create reviews" ON public.mentor_reviews;

CREATE POLICY "Users can create reviews after a booking"
ON public.mentor_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.mentor_bookings b
    WHERE b.mentor_id = mentor_reviews.mentor_id
      AND b.mentee_id = auth.uid()
      AND b.status IN ('confirmed','completed')
  )
);

-- =========================================================
-- 3) Referrals: allow the referred user to insert (issue #8)
-- =========================================================

DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;

CREATE POLICY "Referrer or referred can create referral"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = referrer_id
  OR auth.uid() = referred_id
);
