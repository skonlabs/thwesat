
-- Update welcome bonus eligibility: profile complete + (applied OR posted a job)
CREATE OR REPLACE FUNCTION public.try_grant_signup_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bonus bigint := 1000;
  v_tx uuid;
  v_has_application boolean;
  v_has_job boolean;
  v_qualifying_action boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.wallet_transactions
             WHERE user_id = _user_id AND ref_type = 'signup_bonus') THEN
    RETURN false;
  END IF;

  IF NOT public.is_profile_complete(_user_id) THEN RETURN false; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.applications
    WHERE applicant_id = _user_id AND COALESCE(status,'') <> 'withdrawn'
  ) INTO v_has_application;

  SELECT EXISTS (
    SELECT 1 FROM public.jobs
    WHERE employer_id = _user_id
      AND COALESCE(status,'') NOT IN ('rejected','draft')
  ) INTO v_has_job;

  v_qualifying_action := v_has_application OR v_has_job;
  IF NOT v_qualifying_action THEN RETURN false; END IF;

  INSERT INTO public.wallets(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallet_transactions(
    user_id, kind, credits, mmk_amount, status, ref_type, ref_id,
    idempotency_key, note, created_by
  ) VALUES (
    _user_id, 'topup', v_bonus, v_bonus, 'completed', 'signup_bonus', _user_id::text,
    'signup_bonus:' || _user_id::text,
    CASE WHEN v_has_application
         THEN 'Welcome bonus (profile + first application)'
         ELSE 'Welcome bonus (profile + first job posted)' END,
    _user_id
  ) RETURNING id INTO v_tx;

  PERFORM public._wallet_apply(_user_id, v_bonus, v_bonus);

  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (_user_id, 'payment',
    '🎁 Welcome bonus: 1,000 credits',
    '🎁 ကြိုဆိုဆုကြေး: 1,000 credits',
    CASE WHEN v_has_application
         THEN 'You completed your profile and applied for a job. 1,000 credits added.'
         ELSE 'You completed your profile and posted your first job. 1,000 credits added.' END,
    CASE WHEN v_has_application
         THEN 'ပရိုဖိုင်ပြည့်စုံပြီး အလုပ်တစ်ခု လျှောက်ထားသဖြင့် 1,000 credits ထည့်ပေးပြီးပါပြီ။'
         ELSE 'ပရိုဖိုင်ပြည့်စုံပြီး အလုပ်ခေါ်စာ ပထမဆုံး တင်သဖြင့် 1,000 credits ထည့်ပေးပြီးပါပြီ။' END,
    '/wallet');

  RETURN true;
END;
$$;

-- Trigger on jobs insert (and status update) to check eligibility for employers.
CREATE OR REPLACE FUNCTION public._trg_job_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.try_grant_signup_bonus(NEW.employer_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_signup_bonus ON public.jobs;
CREATE TRIGGER trg_job_signup_bonus
AFTER INSERT OR UPDATE OF status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public._trg_job_signup_bonus();
