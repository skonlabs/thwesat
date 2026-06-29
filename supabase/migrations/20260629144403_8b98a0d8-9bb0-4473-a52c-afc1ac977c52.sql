
DROP FUNCTION IF EXISTS public.match_candidates_for_job(uuid,integer);
DROP FUNCTION IF EXISTS public.match_jobs_for_user(uuid,integer);

CREATE OR REPLACE FUNCTION public.notify_staff_on_topup_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name,'User') INTO v_name FROM public.v_profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, title, title_my, description, description_my, notification_type, link_path)
  SELECT ur.user_id,'New top-up awaiting review','ငွေဖြည့်တောင်းခံမှု စစ်ဆေးရန်',
    COALESCE(v_name,'User')||' submitted a top-up of '||NEW.mmk_amount::text||' MMK',
    COALESCE(v_name,'User')||' မှ '||NEW.mmk_amount::text||' MMK ငွေဖြည့်တောင်းခံပါသည်','payment',
    CASE WHEN ur.role='partner'::public.app_role THEN '/partner/wallet' ELSE '/admin/wallet' END
  FROM public.user_roles ur WHERE ur.role IN ('admin'::public.app_role,'partner'::public.app_role);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_staff_on_subscription_payment_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text; v_item text;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name,'User') INTO v_name FROM public.v_profiles WHERE id = NEW.user_id;
  IF NEW.request_type='subscription' THEN
    SELECT 'package '||COALESCE(sp.tier::text,'subscription') INTO v_item FROM public.subscription_plans sp WHERE sp.id=NEW.plan_id;
  ELSE
    SELECT 'add-on '||COALESCE(ap.label_en, ap.key,'purchase') INTO v_item FROM public.addon_products ap WHERE ap.id=NEW.addon_id;
  END IF;
  INSERT INTO public.notifications (user_id,title,title_my,description,description_my,notification_type,link_path)
  SELECT ur.user_id,'New package payment awaiting review','Package ငွေပေးချေမှု စစ်ဆေးရန်',
    COALESCE(v_name,'User')||' submitted a '||COALESCE(v_item,NEW.request_type)||' payment of '||NEW.mmk_amount::text||' MMK',
    COALESCE(v_name,'User')||' မှ '||NEW.mmk_amount::text||' MMK package ငွေပေးချေမှု တင်သွင်းပါသည်','payment',
    CASE WHEN ur.role='partner'::public.app_role THEN '/partner/wallet' ELSE '/admin/wallet' END
  FROM public.user_roles ur WHERE ur.role IN ('admin'::public.app_role,'partner'::public.app_role);
  RETURN NEW;
END; $$;

DROP FUNCTION IF EXISTS public.notify_staff_on_payment_request_review() CASCADE;

CREATE OR REPLACE FUNCTION public.is_profile_complete(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.v_profiles vp
    LEFT JOIN public.jobseeker_profiles jp ON jp.user_id = vp.id
    WHERE vp.id=_user_id
      AND NULLIF(trim(vp.display_name),'') IS NOT NULL
      AND NULLIF(trim(vp.headline),'') IS NOT NULL
      AND NULLIF(trim(vp.bio),'') IS NOT NULL
      AND NULLIF(trim(vp.location),'') IS NOT NULL
      AND NULLIF(trim(vp.avatar_url),'') IS NOT NULL
      AND jp.skills IS NOT NULL AND cardinality(jp.skills) > 0
      AND jp.languages IS NOT NULL AND cardinality(jp.languages) > 0
  );
$$;

CREATE FUNCTION public.match_candidates_for_job(_job_id uuid, _limit integer)
RETURNS TABLE(id uuid, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH job AS (SELECT j.embedding, j.employer_id FROM public.jobs j WHERE j.id=_job_id)
  SELECT jp.user_id AS id, (1 - (jp.embedding <=> (SELECT embedding FROM job)))::double precision
  FROM public.jobseeker_profiles jp
  WHERE auth.uid() IS NOT NULL AND (SELECT employer_id FROM job)=auth.uid()
    AND (SELECT embedding FROM job) IS NOT NULL AND jp.embedding IS NOT NULL AND jp.user_id<>auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.job_candidate_rejections r WHERE r.job_id=_job_id AND r.seeker_user_id=jp.user_id)
  ORDER BY jp.embedding <=> (SELECT embedding FROM job) LIMIT GREATEST(_limit,1);
$$;

CREATE FUNCTION public.match_jobs_for_user(_user_id uuid, _limit integer)
RETURNS TABLE(id uuid, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH me AS (SELECT embedding FROM public.jobseeker_profiles WHERE user_id=_user_id)
  SELECT j.id, (1 - (j.embedding <=> (SELECT embedding FROM me)))::double precision AS similarity
  FROM public.jobs j
  WHERE j.status='active' AND (j.expires_at IS NULL OR j.expires_at > now())
    AND j.embedding IS NOT NULL AND (SELECT embedding FROM me) IS NOT NULL
  ORDER BY j.embedding <=> (SELECT embedding FROM me) LIMIT GREATEST(_limit,1);
$$;

CREATE OR REPLACE FUNCTION public.redeem_referral_code(_code text, _new_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_input text:=upper(coalesce(_code,'')); v_normalized text; v_match text[]; rc public.referral_codes%ROWTYPE;
BEGIN
  IF _new_user_id IS NULL THEN RAISE EXCEPTION 'invalid_user'; END IF;
  v_match := regexp_match(v_input,'(^|[^A-Z0-9])(TS[^A-Z0-9]*[A-F0-9]{6})([^A-Z0-9]|$)');
  v_normalized := regexp_replace(coalesce(v_match[2],v_input),'[^A-Z0-9]','','g');
  IF length(v_normalized)=6 THEN v_normalized := 'TS'||v_normalized; END IF;
  IF length(v_normalized)=8 AND substr(v_normalized,1,2)='TS' THEN v_normalized := 'TS-'||substr(v_normalized,3); END IF;
  SELECT * INTO rc FROM public.referral_codes WHERE code=v_normalized FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_code'; END IF;
  IF rc.status='used' THEN RAISE EXCEPTION 'code_already_used'; END IF;
  IF rc.owner_id=_new_user_id THEN RAISE EXCEPTION 'cannot_redeem_own_code'; END IF;
  UPDATE public.referral_codes SET status='used', used_by=_new_user_id, used_at=now() WHERE id=rc.id;
  UPDATE public.jobseeker_profiles SET referred_by=rc.code, updated_at=now() WHERE user_id=_new_user_id;
  INSERT INTO public.referrals(referrer_id, referred_id, referral_code, status)
  VALUES (rc.owner_id, _new_user_id, rc.code, 'pending');
  RETURN jsonb_build_object('ok',true,'referrer_id',rc.owner_id,'code',rc.code);
END; $$;

CREATE OR REPLACE FUNCTION public.get_applicant_contact(_applicant_id uuid)
RETURNS TABLE(email text, phone text, unlocked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_caller uuid:=auth.uid(); v_unlocked boolean:=false;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF v_caller=_applicant_id OR public.has_role(v_caller,'admin'::app_role) THEN
    v_unlocked := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.feature_unlocks
      WHERE user_id=v_caller AND feature_key='unlock_contact'
        AND target_id=_applicant_id::text AND is_active=true
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO v_unlocked;
  END IF;
  IF NOT v_unlocked THEN RETURN QUERY SELECT NULL::text,NULL::text,false; RETURN; END IF;
  RETURN QUERY
    SELECT u.email::text, (u.raw_user_meta_data->>'phone')::text, true
    FROM auth.users u WHERE u.id=_applicant_id;
END; $$;

CREATE OR REPLACE FUNCTION public.set_user_suspended(_user_id uuid, _suspended boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_caller uuid:=auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'invalid_user'; END IF;
  IF public.has_role(_user_id,'admin'::app_role) THEN RAISE EXCEPTION 'cannot_suspend_admin'; END IF;
  INSERT INTO public.user_account_state(user_id, is_suspended, updated_at)
    VALUES (_user_id,_suspended, now())
    ON CONFLICT (user_id) DO UPDATE SET is_suspended=EXCLUDED.is_suspended, updated_at=now();
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,details)
  VALUES (v_caller, CASE WHEN _suspended THEN 'user_suspended' ELSE 'user_unsuspended' END,'user',_user_id::text,'{}'::jsonb);
  RETURN jsonb_build_object('ok',true,'is_suspended',_suspended);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_link_partner_user(_partner_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid:=auth.uid(); v_partner_label text;
BEGIN
  IF NOT public.has_role(v_actor,'admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT COALESCE(display_name,code) INTO v_partner_label FROM public.partner_profiles WHERE user_id=_partner_id;
  IF v_partner_label IS NULL THEN RAISE EXCEPTION 'partner_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=_user_id) THEN RAISE EXCEPTION 'user_not_found'; END IF;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,details)
  VALUES (v_actor,'partner_link_user','partner',_partner_id::text, jsonb_build_object('user_id',_user_id,'partner_label',v_partner_label));
END; $$;

CREATE OR REPLACE FUNCTION public.delete_user_cascade(_target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  DELETE FROM public.post_likes        WHERE user_id=_target_user_id;
  DELETE FROM public.post_saves        WHERE user_id=_target_user_id;
  DELETE FROM public.post_comments     WHERE author_id=_target_user_id;
  DELETE FROM public.community_posts   WHERE author_id=_target_user_id;
  DELETE FROM public.saved_jobs        WHERE user_id=_target_user_id;
  DELETE FROM public.applications      WHERE applicant_id=_target_user_id;
  DELETE FROM public.jobs              WHERE employer_id=_target_user_id;
  DELETE FROM public.mentor_earnings           WHERE mentor_id=_target_user_id;
  DELETE FROM public.mentor_reviews            WHERE reviewer_id=_target_user_id OR mentor_id=_target_user_id;
  DELETE FROM public.mentor_bookings           WHERE mentor_id=_target_user_id OR mentee_id=_target_user_id;
  DELETE FROM public.mentor_mentees            WHERE mentor_id=_target_user_id OR mentee_id=_target_user_id;
  DELETE FROM public.mentor_availability_slots WHERE mentor_id=_target_user_id;
  DELETE FROM public.mentor_profiles           WHERE id=_target_user_id;
  DELETE FROM public.employer_profiles WHERE id=_target_user_id;
  DELETE FROM public.agent_profiles    WHERE user_id=_target_user_id;
  DELETE FROM public.jobseeker_profiles WHERE user_id=_target_user_id;
  DELETE FROM public.admin_profiles    WHERE user_id=_target_user_id;
  DELETE FROM public.partner_profiles  WHERE user_id=_target_user_id;
  DELETE FROM public.user_documents      WHERE user_id=_target_user_id;
  DELETE FROM public.generated_documents WHERE user_id=_target_user_id;
  DELETE FROM public.guide_feedback    WHERE user_id=_target_user_id;
  DELETE FROM public.messages WHERE conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id=_target_user_id);
  DELETE FROM public.conversation_participants WHERE user_id=_target_user_id;
  DELETE FROM public.conversations WHERE id NOT IN (SELECT DISTINCT conversation_id FROM public.conversation_participants);
  DELETE FROM public.notifications     WHERE user_id=_target_user_id;
  DELETE FROM public.topup_requests    WHERE user_id=_target_user_id;
  DELETE FROM public.subscription_payment_requests WHERE user_id=_target_user_id;
  DELETE FROM public.wallet_transactions WHERE user_id=_target_user_id;
  DELETE FROM public.wallets           WHERE user_id=_target_user_id;
  DELETE FROM public.feature_unlocks   WHERE user_id=_target_user_id;
  DELETE FROM public.user_account_state WHERE user_id=_target_user_id;
  DELETE FROM public.user_settings     WHERE user_id=_target_user_id;
  DELETE FROM public.user_roles        WHERE user_id=_target_user_id;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,details)
  VALUES (auth.uid(),'delete_user_cascade','user',_target_user_id::text,'{}'::jsonb);
END; $$;

GRANT EXECUTE ON FUNCTION public.match_candidates_for_job(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_jobs_for_user(uuid,integer) TO authenticated;
