
-- 1. RPC: get_applicant_contact
CREATE OR REPLACE FUNCTION public.get_applicant_contact(_applicant_id uuid)
RETURNS TABLE(email text, phone text, unlocked boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_unlocked boolean := false;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF v_caller = _applicant_id OR public.has_role(v_caller, 'admin'::app_role) THEN
    v_unlocked := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.feature_unlocks
      WHERE user_id = v_caller
        AND feature_key = 'unlock_contact'
        AND target_id = _applicant_id::text
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO v_unlocked;
  END IF;
  IF NOT v_unlocked THEN
    RETURN QUERY SELECT NULL::text, NULL::text, false;
    RETURN;
  END IF;
  RETURN QUERY SELECT p.email, p.phone, true FROM public.profiles p WHERE p.id = _applicant_id;
END; $$;

-- 2. Trigger: auto refresh is_featured on feature_unlocks change
CREATE OR REPLACE FUNCTION public._trg_refresh_job_featured()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_target text;
BEGIN
  v_target := COALESCE(NEW.target_id, OLD.target_id);
  IF v_target IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF COALESCE(NEW.feature_key, OLD.feature_key) IN ('feature_job_upgrade','featured_job') THEN
    BEGIN
      PERFORM public.refresh_job_featured(v_target::uuid);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS feature_unlocks_refresh_featured ON public.feature_unlocks;
CREATE TRIGGER feature_unlocks_refresh_featured
AFTER INSERT OR UPDATE OR DELETE ON public.feature_unlocks
FOR EACH ROW EXECUTE FUNCTION public._trg_refresh_job_featured();

-- 3. Internal escrow release (no auth check) + trigger
CREATE OR REPLACE FUNCTION public._mentor_session_release_internal(_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.mentor_session_escrow%ROWTYPE;
        v_mentor_credits bigint; v_tx uuid;
BEGIN
  SELECT * INTO e FROM public.mentor_session_escrow WHERE booking_id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF e.status <> 'held' THEN RETURN; END IF;
  v_mentor_credits := floor(e.credits_held * 0.85);
  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, note, created_by)
  VALUES (e.mentor_id,'earning',v_mentor_credits,'completed','booking',_booking_id::text,'Mentor session earnings (auto-release)', e.mentor_id)
  RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(e.mentor_id, v_mentor_credits, 0);
  INSERT INTO public.mentor_earnings(mentor_id, booking_id, amount, currency, status, paid_out_at)
  VALUES (e.mentor_id, _booking_id, v_mentor_credits, 'CREDITS','paid', now());
  UPDATE public.mentor_session_escrow SET status='released', release_tx_id=v_tx, resolved_at=now() WHERE booking_id=_booking_id;
END; $$;

CREATE OR REPLACE FUNCTION public._trg_mentor_booking_auto_release()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.mentor_completed_at IS NOT NULL AND NEW.mentee_completed_at IS NOT NULL
     AND (OLD.mentor_completed_at IS NULL OR OLD.mentee_completed_at IS NULL) THEN
    PERFORM public._mentor_session_release_internal(NEW.id);
    UPDATE public.mentor_bookings SET status='completed' WHERE id = NEW.id AND status <> 'completed';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS mentor_booking_auto_release ON public.mentor_bookings;
CREATE TRIGGER mentor_booking_auto_release
AFTER UPDATE ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public._trg_mentor_booking_auto_release();
