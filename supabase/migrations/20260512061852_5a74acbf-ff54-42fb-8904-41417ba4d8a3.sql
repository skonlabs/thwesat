
-- B5 — mark_session_complete RPC
CREATE OR REPLACE FUNCTION public.mark_session_complete(_booking_id uuid, _role text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.mentor_bookings%ROWTYPE; v_caller uuid := auth.uid();
BEGIN
  IF _role NOT IN ('mentor','mentee') THEN RAISE EXCEPTION 'invalid_role'; END IF;
  SELECT * INTO b FROM public.mentor_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF _role = 'mentor' THEN
    IF v_caller <> b.mentor_id AND NOT public.has_role(v_caller,'admin'::app_role) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
    UPDATE public.mentor_bookings
       SET mentor_completed_at = COALESCE(mentor_completed_at, now()),
           status = CASE WHEN mentee_completed_at IS NOT NULL THEN 'completed' ELSE status END,
           updated_at = now()
     WHERE id = _booking_id
     RETURNING * INTO b;
  ELSE
    IF v_caller <> b.mentee_id AND NOT public.has_role(v_caller,'admin'::app_role) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
    UPDATE public.mentor_bookings
       SET mentee_completed_at = COALESCE(mentee_completed_at, now()),
           status = CASE WHEN mentor_completed_at IS NOT NULL THEN 'completed' ELSE status END,
           updated_at = now()
     WHERE id = _booking_id
     RETURNING * INTO b;
  END IF;
  RETURN jsonb_build_object('ok',true,'status',b.status,
    'mentor_completed_at', b.mentor_completed_at, 'mentee_completed_at', b.mentee_completed_at);
END $$;
