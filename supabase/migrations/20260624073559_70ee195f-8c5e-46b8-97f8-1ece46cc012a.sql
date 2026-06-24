-- MA2: lock down mentor_bookings UPDATE columns + status transitions.
CREATE OR REPLACE FUNCTION public.mentor_bookings_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_caller IS NULL THEN RETURN NEW; END IF;
  v_is_admin := public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'moderator'::app_role);
  IF v_is_admin THEN RETURN NEW; END IF;

  -- Immutable identity / schedule / pricing columns.
  IF NEW.mentor_id IS DISTINCT FROM OLD.mentor_id
     OR NEW.mentee_id IS DISTINCT FROM OLD.mentee_id
     OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
     OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time
     OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
     OR NEW.credits_charged IS DISTINCT FROM OLD.credits_charged
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'forbidden_column_update' USING HINT='These fields cannot be changed after a booking is created.';
  END IF;

  -- Status transitions:
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_caller = OLD.mentee_id AND v_caller <> OLD.mentor_id THEN
      -- Mentee may only cancel their own booking.
      IF NEW.status NOT IN ('cancelled') THEN
        RAISE EXCEPTION 'mentee_can_only_cancel' USING HINT='Mentees may only cancel; confirmation and completion are mentor actions.';
      END IF;
    ELSIF v_caller = OLD.mentor_id THEN
      -- Mentor may confirm/decline/complete/cancel; cannot rewind to 'pending' once past it.
      IF NEW.status NOT IN ('pending','confirmed','completed','cancelled','declined') THEN
        RAISE EXCEPTION 'invalid_status_transition';
      END IF;
    ELSE
      RAISE EXCEPTION 'not_authorized_status_change';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_bookings_update_guard ON public.mentor_bookings;
CREATE TRIGGER trg_mentor_bookings_update_guard
  BEFORE UPDATE ON public.mentor_bookings
  FOR EACH ROW EXECUTE FUNCTION public.mentor_bookings_update_guard();
