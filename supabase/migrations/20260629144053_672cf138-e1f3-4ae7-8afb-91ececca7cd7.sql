
-- 1) Fix ensure_job_company: replace dropped public.profiles with v_profiles
CREATE OR REPLACE FUNCTION public.ensure_job_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.company, '') = '' THEN
    SELECT COALESCE(NULLIF(ep.company_name, ''), NULLIF(vp.display_name, ''), 'Employer')
      INTO NEW.company
    FROM public.v_profiles vp
    LEFT JOIN public.employer_profiles ep ON ep.id = vp.id
    WHERE vp.id = NEW.employer_id;
    IF COALESCE(NEW.company, '') = '' THEN NEW.company := 'Employer'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Drop the broken duplicate status-history trigger; log_job_status_change covers both INSERT and UPDATE correctly.
DROP TRIGGER IF EXISTS trg_jobs_record_status_history ON public.jobs;
DROP FUNCTION IF EXISTS public.jobs_record_status_history();

-- 3) Fix _mirror_topup_to_wallet_tx ON CONFLICT to match the partial unique index
CREATE OR REPLACE FUNCTION public._mirror_topup_to_wallet_tx()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.wallet_transactions
      WHERE source_table='topup_requests' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.wallet_transactions(
    user_id, kind, credits, mmk_amount, status, currency,
    payment_method, proof_url, sender_reference, admin_note,
    reviewed_by, reviewed_at, package_id, quantity, payment_type,
    request_type, note, metadata, created_at, updated_at,
    source_table, source_id, ref_type, ref_id
  ) VALUES (
    NEW.user_id, 'topup',
    CASE WHEN NEW.status='approved' THEN NEW.credits_to_grant ELSE 0 END,
    NEW.mmk_amount, NEW.status, 'MMK',
    NEW.payment_method, NEW.proof_url, NEW.sender_reference,
    NEW.admin_note, NEW.reviewed_by, NEW.reviewed_at,
    NEW.package_id, 1, 'wallet_topup', 'topup', 'Wallet top-up',
    jsonb_build_object('credits_to_grant', NEW.credits_to_grant),
    NEW.created_at, NEW.updated_at,
    'topup_requests', NEW.id, 'topup_request', NEW.id::text
  )
  ON CONFLICT (source_table, source_id)
    WHERE source_table IS NOT NULL AND source_id IS NOT NULL
  DO UPDATE SET
    credits = EXCLUDED.credits,
    status = EXCLUDED.status,
    admin_note = EXCLUDED.admin_note,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at,
    payment_method = EXCLUDED.payment_method,
    proof_url = EXCLUDED.proof_url,
    sender_reference = EXCLUDED.sender_reference,
    package_id = EXCLUDED.package_id,
    mmk_amount = EXCLUDED.mmk_amount,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- 4) Add SELECT policy so users can read their own topup requests (+ admins read all)
CREATE POLICY "Users read own topups"
  ON public.topup_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
