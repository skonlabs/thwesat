CREATE OR REPLACE FUNCTION public.sync_partner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On link: grant partner role
  IF NEW.user_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'partner'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- On unlink: remove partner role from previous user if they no longer link to any partner
  IF TG_OP = 'UPDATE' AND OLD.user_id IS NOT NULL AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    IF NOT EXISTS (SELECT 1 FROM public.partners WHERE user_id = OLD.user_id AND id <> OLD.id) THEN
      DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = 'partner'::app_role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_partner_role ON public.partners;
CREATE TRIGGER trg_sync_partner_role
AFTER INSERT OR UPDATE OF user_id ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.sync_partner_role();

-- Backfill: ensure all currently-linked partners have the partner role
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'partner'::app_role FROM public.partners WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;