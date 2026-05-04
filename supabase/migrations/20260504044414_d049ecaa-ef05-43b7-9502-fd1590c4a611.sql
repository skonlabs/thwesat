
-- Career track enrollment using wallet credits
CREATE OR REPLACE FUNCTION public.enroll_career_track(_track_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_track public.career_tracks%ROWTYPE;
  v_existing uuid;
  v_tx uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_track FROM public.career_tracks WHERE id = _track_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'track_not_found'; END IF;

  SELECT id INTO v_existing FROM public.career_track_enrollments
    WHERE user_id = v_user AND track_id = _track_id AND status IN ('enrolled','active','completed');
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_enrolled', true, 'enrollment', v_existing);
  END IF;

  IF (SELECT COALESCE(balance_credits,0) FROM public.wallets WHERE user_id = v_user) < v_track.price_credits THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, note, created_by)
  VALUES (v_user, 'spend', -v_track.price_credits, 'completed', 'career_track', _track_id::text,
          'Career Track enrollment', v_user)
  RETURNING id INTO v_tx;

  PERFORM public._wallet_apply(v_user, -v_track.price_credits, 0);

  INSERT INTO public.career_track_enrollments(user_id, track_id, credits_paid, status)
  VALUES (v_user, _track_id, v_track.price_credits, 'enrolled')
  RETURNING id INTO v_existing;

  -- Notify mentor
  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (v_track.mentor_id, 'mentor', 'New Career Track enrollment', 'Career Track ဝင်ရောက်မှု အသစ်',
          'A mentee enrolled in your track.', 'Mentee တစ်ဦး သင့် track တွင် ဝင်ရောက်ပါသည်။',
          '/mentors/dashboard');

  RETURN jsonb_build_object('ok', true, 'enrollment', v_existing, 'tx', v_tx);
END;
$$;

-- Allow career track enrollment INSERT only via the SECURITY DEFINER function
-- (The existing SELECT policy already covers viewing.)

-- Allow mentees to insert their own enrollment is NOT exposed; only the function inserts.
