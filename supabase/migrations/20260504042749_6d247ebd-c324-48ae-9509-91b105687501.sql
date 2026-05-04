
-- ============================================================
-- WALLET & CREDITS SYSTEM
-- ============================================================

-- 1. WALLETS
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY,
  balance_credits bigint NOT NULL DEFAULT 0 CHECK (balance_credits >= 0),
  lifetime_topup_mmk bigint NOT NULL DEFAULT 0,
  lifetime_spent_credits bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
-- No direct INSERT/UPDATE/DELETE; only SECURITY DEFINER RPCs may write.

-- 2. WALLET TRANSACTIONS (immutable ledger)
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('topup','spend','earning','escrow_hold','escrow_release','refund','adjustment','migration','payout')),
  credits bigint NOT NULL, -- signed: +credit / -debit from balance
  mmk_amount bigint,        -- only for topup
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
  ref_type text,            -- 'topup_request','action','booking','career_track','adjustment',...
  ref_id text,
  idempotency_key text UNIQUE,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_ref ON public.wallet_transactions(ref_type, ref_id);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tx" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

-- 3. CREDIT PACKAGES
CREATE TABLE public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_my text NOT NULL DEFAULT '',
  price_mmk bigint NOT NULL CHECK (price_mmk > 0),
  credits bigint NOT NULL CHECK (credits > 0),
  bonus_credits bigint NOT NULL DEFAULT 0 CHECK (bonus_credits >= 0),
  badge_en text,
  badge_my text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active packages readable" ON public.credit_packages FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage packages" ON public.credit_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 4. ACTION PRICES
CREATE TABLE public.action_prices (
  action_key text PRIMARY KEY,
  label_en text NOT NULL,
  label_my text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  description_my text NOT NULL DEFAULT '',
  price_credits bigint NOT NULL CHECK (price_credits >= 0),
  duration_days int, -- null = consumable / one-time; >0 = unlock window
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.action_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active prices" ON public.action_prices FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage prices" ON public.action_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 5. TOP-UP REQUESTS (manual proof flow)
CREATE TABLE public.topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid REFERENCES public.credit_packages(id),
  mmk_amount bigint NOT NULL CHECK (mmk_amount > 0),
  credits_to_grant bigint NOT NULL CHECK (credits_to_grant > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('kbzpay','wavepay','cbpay','ayapay','bank_transfer','manual')),
  proof_url text,
  sender_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_topup_user ON public.topup_requests(user_id, created_at DESC);
CREATE INDEX idx_topup_status ON public.topup_requests(status);
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own topups" ON public.topup_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users create own topups" ON public.topup_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins update topups" ON public.topup_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 6. FEATURE UNLOCKS (boosts, contact unlocks, featured listings)
CREATE TABLE public.feature_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL, -- profile_boost, priority_application, unlock_contact, featured_job, candidate_boost
  target_type text,           -- 'profile','application','candidate','job'
  target_id text,
  credits_spent bigint NOT NULL,
  transaction_id uuid REFERENCES public.wallet_transactions(id),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,     -- null = permanent (e.g., contact unlock)
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_unlock_user_feature ON public.feature_unlocks(user_id, feature_key);
CREATE INDEX idx_unlock_target ON public.feature_unlocks(feature_key, target_type, target_id);
-- Prevent paying twice for the same permanent unlock (e.g., same candidate contact)
CREATE UNIQUE INDEX uq_unlock_permanent ON public.feature_unlocks(user_id, feature_key, target_id)
  WHERE expires_at IS NULL AND is_active = true AND target_id IS NOT NULL;
ALTER TABLE public.feature_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own unlocks" ON public.feature_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

-- 7. MENTOR SESSION ESCROW
CREATE TABLE public.mentor_session_escrow (
  booking_id uuid PRIMARY KEY,
  mentee_id uuid NOT NULL,
  mentor_id uuid NOT NULL,
  credits_held bigint NOT NULL CHECK (credits_held > 0),
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','refunded')),
  hold_tx_id uuid REFERENCES public.wallet_transactions(id),
  release_tx_id uuid REFERENCES public.wallet_transactions(id),
  refund_tx_id uuid REFERENCES public.wallet_transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.mentor_session_escrow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties view escrow" ON public.mentor_session_escrow FOR SELECT TO authenticated
  USING (auth.uid() = mentee_id OR auth.uid() = mentor_id OR public.has_role(auth.uid(),'admin'::app_role));

-- 8. CAREER TRACKS
CREATE TABLE public.career_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  title_en text NOT NULL,
  title_my text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  description_my text NOT NULL DEFAULT '',
  price_credits bigint NOT NULL CHECK (price_credits > 0),
  total_sessions int NOT NULL DEFAULT 1,
  cover_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.career_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active tracks readable" ON public.career_tracks FOR SELECT TO authenticated
  USING (is_active = true OR auth.uid() = mentor_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Mentors manage own tracks" ON public.career_tracks FOR ALL TO authenticated
  USING (auth.uid() = mentor_id OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (auth.uid() = mentor_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.career_track_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  credits_paid bigint NOT NULL,
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled','in_progress','completed','refunded')),
  sessions_completed int NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(track_id, user_id)
);
ALTER TABLE public.career_track_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentee or mentor or admin" ON public.career_track_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.career_tracks t WHERE t.id = track_id AND t.mentor_id = auth.uid()));

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_credit_packages_updated BEFORE UPDATE ON public.credit_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_action_prices_updated BEFORE UPDATE ON public.action_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_topup_updated BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_career_tracks_updated BEFORE UPDATE ON public.career_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create wallet on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets(user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- ============================================================
-- RPCs
-- ============================================================

-- Internal balance writer (not exposed publicly via API; called by other RPCs)
CREATE OR REPLACE FUNCTION public._wallet_apply(_user uuid, _delta bigint, _topup_mmk bigint DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets(user_id, balance_credits) VALUES (_user, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET
    balance_credits = balance_credits + _delta,
    lifetime_topup_mmk = lifetime_topup_mmk + COALESCE(_topup_mmk,0),
    lifetime_spent_credits = lifetime_spent_credits + CASE WHEN _delta < 0 THEN -_delta ELSE 0 END,
    updated_at = now()
  WHERE user_id = _user;
  IF (SELECT balance_credits FROM public.wallets WHERE user_id = _user) < 0 THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;
END; $$;

-- TOP-UP APPROVE
CREATE OR REPLACE FUNCTION public.wallet_topup_approve(_topup_id uuid, _admin_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.topup_requests%ROWTYPE; v_tx uuid; v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller,'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO r FROM public.topup_requests WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup_not_found'; END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok',true,'noop',true,'status',r.status); END IF;

  INSERT INTO public.wallet_transactions(user_id, kind, credits, mmk_amount, status, ref_type, ref_id, idempotency_key, note, created_by)
  VALUES (r.user_id, 'topup', r.credits_to_grant, r.mmk_amount, 'completed', 'topup_request', r.id::text,
          'topup:' || r.id::text, _admin_note, v_caller)
  RETURNING id INTO v_tx;

  PERFORM public._wallet_apply(r.user_id, r.credits_to_grant, r.mmk_amount);

  UPDATE public.topup_requests SET status='approved', reviewed_by=v_caller, reviewed_at=now(), admin_note=COALESCE(_admin_note, admin_note) WHERE id=_topup_id;

  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (r.user_id,'payment','Top-up approved','ငွေဖြည့်မှု အတည်ပြုပြီး',
          r.credits_to_grant || ' credits added to your wallet.',
          r.credits_to_grant || ' credits ပိုက်ဆံအိတ်သို့ ထည့်ပြီးပါပြီ။','/wallet');
  RETURN jsonb_build_object('ok',true,'tx',v_tx);
END; $$;

-- TOP-UP REJECT
CREATE OR REPLACE FUNCTION public.wallet_topup_reject(_topup_id uuid, _admin_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.topup_requests%ROWTYPE; v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller,'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO r FROM public.topup_requests WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup_not_found'; END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok',true,'noop',true,'status',r.status); END IF;
  UPDATE public.topup_requests SET status='rejected', reviewed_by=v_caller, reviewed_at=now(), admin_note=COALESCE(_admin_note, admin_note) WHERE id=_topup_id;
  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (r.user_id,'payment','Top-up rejected','ငွေဖြည့်မှု ငြင်းပယ်ခံရပါသည်',
          COALESCE(_admin_note,'Please contact support.'), COALESCE(_admin_note,'Support သို့ ဆက်သွယ်ပါ။'),'/wallet');
  RETURN jsonb_build_object('ok',true);
END; $$;

-- SPEND (single source of truth for paid actions)
CREATE OR REPLACE FUNCTION public.wallet_spend(
  _action_key text,
  _target_type text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _idempotency_key text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_price bigint; v_duration int; v_tx uuid; v_unlock uuid;
  v_existing uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT price_credits, duration_days INTO v_price, v_duration FROM public.action_prices WHERE action_key = _action_key AND is_active = true;
  IF v_price IS NULL THEN RAISE EXCEPTION 'invalid_action: %', _action_key; END IF;

  -- Idempotency: return existing tx if same key already used
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.wallet_transactions WHERE idempotency_key = _idempotency_key;
    IF v_existing IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'noop',true,'tx',v_existing); END IF;
  END IF;

  -- Permanent unlock dedupe (e.g., already unlocked this candidate)
  IF v_duration IS NULL AND _target_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.feature_unlocks
      WHERE user_id = v_user AND feature_key = _action_key AND target_id = _target_id AND is_active = true AND expires_at IS NULL;
    IF v_existing IS NOT NULL THEN
      RETURN jsonb_build_object('ok',true,'already_unlocked',true,'unlock',v_existing);
    END IF;
  END IF;

  -- Check balance
  IF (SELECT COALESCE(balance_credits,0) FROM public.wallets WHERE user_id = v_user) < v_price THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, idempotency_key, note, metadata, created_by)
  VALUES (v_user,'spend',-v_price,'completed','action',_action_key,_idempotency_key,
          _action_key, _metadata || jsonb_build_object('target_type',_target_type,'target_id',_target_id), v_user)
  RETURNING id INTO v_tx;

  PERFORM public._wallet_apply(v_user, -v_price, 0);

  INSERT INTO public.feature_unlocks(user_id, feature_key, target_type, target_id, credits_spent, transaction_id, expires_at, metadata)
  VALUES (v_user, _action_key, _target_type, _target_id, v_price, v_tx,
          CASE WHEN v_duration IS NOT NULL THEN now() + (v_duration || ' days')::interval ELSE NULL END,
          _metadata)
  RETURNING id INTO v_unlock;

  RETURN jsonb_build_object('ok',true,'tx',v_tx,'unlock',v_unlock,'price',v_price,
                            'new_balance',(SELECT balance_credits FROM public.wallets WHERE user_id=v_user));
END; $$;

-- ADMIN ADJUST
CREATE OR REPLACE FUNCTION public.wallet_adjust(_user_id uuid, _delta bigint, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); v_tx uuid;
BEGIN
  IF NOT public.has_role(v_caller,'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _delta = 0 THEN RAISE EXCEPTION 'zero_delta'; END IF;
  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, note, created_by)
  VALUES (_user_id,'adjustment',_delta,'completed','adjustment',_note,v_caller) RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(_user_id, _delta, 0);
  RETURN jsonb_build_object('ok',true,'tx',v_tx);
END; $$;

-- ADMIN REFUND
CREATE OR REPLACE FUNCTION public.wallet_refund_transaction(_tx_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.wallet_transactions%ROWTYPE; v_caller uuid := auth.uid(); v_new uuid;
BEGIN
  IF NOT public.has_role(v_caller,'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO r FROM public.wallet_transactions WHERE id = _tx_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'tx_not_found'; END IF;
  IF r.status = 'reversed' THEN RAISE EXCEPTION 'already_reversed'; END IF;
  IF r.kind NOT IN ('spend','earning') THEN RAISE EXCEPTION 'cannot_refund_kind: %', r.kind; END IF;

  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, note, created_by, metadata)
  VALUES (r.user_id,'refund',-r.credits,'completed','refund',r.id::text, _reason, v_caller, jsonb_build_object('original_tx',r.id))
  RETURNING id INTO v_new;
  PERFORM public._wallet_apply(r.user_id, -r.credits, 0);
  UPDATE public.wallet_transactions SET status='reversed' WHERE id = r.id;
  -- Deactivate any feature_unlocks tied to this tx
  UPDATE public.feature_unlocks SET is_active=false WHERE transaction_id = r.id;
  RETURN jsonb_build_object('ok',true,'refund_tx',v_new);
END; $$;

-- MENTOR ESCROW HOLD
CREATE OR REPLACE FUNCTION public.mentor_book_with_credits(_booking_id uuid, _credits bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); b public.mentor_bookings%ROWTYPE; v_tx uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _credits <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  SELECT * INTO b FROM public.mentor_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF b.mentee_id <> v_user THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF EXISTS (SELECT 1 FROM public.mentor_session_escrow WHERE booking_id = _booking_id) THEN
    RAISE EXCEPTION 'already_held';
  END IF;
  IF (SELECT COALESCE(balance_credits,0) FROM public.wallets WHERE user_id = v_user) < _credits THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, note, created_by)
  VALUES (v_user,'escrow_hold',-_credits,'completed','booking',_booking_id::text,'Mentor session hold',v_user)
  RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(v_user, -_credits, 0);

  INSERT INTO public.mentor_session_escrow(booking_id, mentee_id, mentor_id, credits_held, hold_tx_id)
  VALUES (_booking_id, v_user, b.mentor_id, _credits, v_tx);

  UPDATE public.mentor_bookings SET payment_status='paid' WHERE id = _booking_id;
  RETURN jsonb_build_object('ok',true,'tx',v_tx);
END; $$;

-- MENTOR ESCROW RELEASE (85/15)
CREATE OR REPLACE FUNCTION public.mentor_session_release(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.mentor_session_escrow%ROWTYPE; v_caller uuid := auth.uid();
        v_mentor_credits bigint; v_platform_credits bigint; v_tx uuid;
BEGIN
  SELECT * INTO e FROM public.mentor_session_escrow WHERE booking_id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'escrow_not_found'; END IF;
  IF e.status <> 'held' THEN RETURN jsonb_build_object('ok',true,'noop',true,'status',e.status); END IF;
  IF NOT (v_caller = e.mentor_id OR v_caller = e.mentee_id OR public.has_role(v_caller,'admin'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_mentor_credits := floor(e.credits_held * 0.85);
  v_platform_credits := e.credits_held - v_mentor_credits;

  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, note, created_by)
  VALUES (e.mentor_id,'earning',v_mentor_credits,'completed','booking',_booking_id::text,'Mentor session earnings',v_caller)
  RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(e.mentor_id, v_mentor_credits, 0);

  -- Mirror earnings row for reporting (uses existing mentor_earnings table)
  INSERT INTO public.mentor_earnings(mentor_id, booking_id, amount, currency, status, paid_out_at)
  VALUES (e.mentor_id, _booking_id, v_mentor_credits, 'CREDITS','paid', now());

  UPDATE public.mentor_session_escrow SET status='released', release_tx_id=v_tx, resolved_at=now() WHERE booking_id=_booking_id;
  RETURN jsonb_build_object('ok',true,'mentor_credits',v_mentor_credits,'platform_credits',v_platform_credits);
END; $$;

-- MENTOR ESCROW REFUND
CREATE OR REPLACE FUNCTION public.mentor_session_refund(_booking_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.mentor_session_escrow%ROWTYPE; v_caller uuid := auth.uid(); v_tx uuid;
BEGIN
  SELECT * INTO e FROM public.mentor_session_escrow WHERE booking_id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'escrow_not_found'; END IF;
  IF e.status <> 'held' THEN RETURN jsonb_build_object('ok',true,'noop',true,'status',e.status); END IF;
  IF NOT (v_caller = e.mentor_id OR public.has_role(v_caller,'admin'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, note, created_by)
  VALUES (e.mentee_id,'refund',e.credits_held,'completed','booking',_booking_id::text,COALESCE(_reason,'Session refunded'),v_caller)
  RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(e.mentee_id, e.credits_held, 0);
  UPDATE public.mentor_session_escrow SET status='refunded', refund_tx_id=v_tx, resolved_at=now() WHERE booking_id=_booking_id;
  UPDATE public.mentor_bookings SET payment_status='refunded' WHERE id = _booking_id;
  RETURN jsonb_build_object('ok',true,'refund_tx',v_tx);
END; $$;

-- ============================================================
-- SEED DEFAULTS
-- ============================================================
INSERT INTO public.credit_packages(name_en, name_my, price_mmk, credits, bonus_credits, badge_en, badge_my, sort_order) VALUES
  ('Starter','စတင်သုံးစွဲ',5000,5000,0,NULL,NULL,1),
  ('Popular','လူကြိုက်များ',10000,10000,500,'+5%','+5%',2),
  ('Value','တန်ဖိုးရှိ',25000,25000,2000,'+8%','+8%',3),
  ('Power','အကောင်းဆုံး',50000,50000,6000,'+12%','+12%',4)
ON CONFLICT DO NOTHING;

INSERT INTO public.action_prices(action_key, label_en, label_my, description_en, description_my, price_credits, duration_days) VALUES
  ('profile_boost','Profile Boost','ပရိုဖိုင် မြှင့်တင်','Rank higher in employer searches for 7 days.','၇ ရက်အတွင်း employer ရှာဖွေမှုများတွင် ထိပ်ဆုံးမှ ပေါ်လာစေသည်။',1500,7),
  ('priority_application','Priority Application','ဦးစားပေး လျှောက်လွှာ','Your application appears at the top of the employer''s list.','သင့်လျှောက်လွှာ employer စာရင်း၏ ထိပ်တွင် ပေါ်လာမည်။',1000,NULL),
  ('cv_rewrite','CV Rewrite','CV ပြန်ရေးပေး','Rewrite your CV for impact and clarity.','သင့် CV ကို ပိုကောင်းအောင် ပြန်ရေးပေးမည်။',800,NULL),
  ('skill_gap','Skill Gap Analysis','ကျွမ်းကျင်မှု ကွာဟမှု','Identify the skills you need for your target role.','သင်ပန်းတိုင်ထားသော အလုပ်အတွက် လိုအပ်သော ကျွမ်းကျင်မှုများ ဖော်ထုတ်ပေးမည်။',800,NULL),
  ('career_insights','Career Insights','အသက်မွေးဝမ်း အကြံပြုချက်','Personalised career path insights.','ကိုယ်ပိုင် အသက်မွေးလမ်းကြောင်း အကြံပြုချက်များ။',500,NULL),
  ('unlock_contact','Unlock Candidate Contact','ကိုယ်စားလှယ် ဆက်သွယ်ရန် ဖွင့်','See email and phone of one candidate.','ကိုယ်စားလှယ်တစ်ဦး၏ email နှင့် ဖုန်းနံပါတ် ကြည့်နိုင်မည်။',3000,NULL),
  ('featured_job','Featured Job Listing','ထူးခြားသော အလုပ် ကြော်ငြာ','Highlight your job in the top section for 7 days.','သင့်အလုပ်ကြော်ငြာကို ၇ ရက်ထိပ်တန်းနေရာတွင် ပြသမည်။',10000,7),
  ('candidate_boost','Candidate Boost','အလုပ် မြှင့်တင်','Boost visibility of your job posting for 7 days.','သင့်အလုပ်ကြော်ငြာ မြင်ရမှုကို ၇ ရက် တိုးမြှင့်မည်။',5000,7)
ON CONFLICT (action_key) DO NOTHING;

-- ============================================================
-- BACKFILL: wallets for existing users + migrate active subscriptions to credits
-- ============================================================
INSERT INTO public.wallets(user_id) SELECT id FROM auth.users ON CONFLICT (user_id) DO NOTHING;

-- Grant migration credits: 5,000 credits per remaining month (rounded up) for each active sub
DO $$
DECLARE s record; v_months int; v_credits bigint; v_tx uuid;
BEGIN
  FOR s IN
    SELECT user_id, current_period_end, plan_type FROM public.subscriptions
    WHERE status='active' AND current_period_end > now()
  LOOP
    v_months := GREATEST(1, CEIL(EXTRACT(epoch FROM (s.current_period_end - now()))/2592000.0)::int);
    v_credits := v_months * 5000;
    INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, idempotency_key, note)
    VALUES (s.user_id,'migration',v_credits,'completed','subscription_migration', s.plan_type,
            'migration:'||s.user_id::text||':'||s.plan_type,
            'Migration credit for ' || v_months || ' remaining month(s) of ' || s.plan_type)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_tx;
    IF v_tx IS NOT NULL THEN
      PERFORM public._wallet_apply(s.user_id, v_credits, 0);
    END IF;
  END LOOP;
END $$;
