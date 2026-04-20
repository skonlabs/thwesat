-- Create app_config table for editable runtime configuration (payment accounts, telegram bot, etc.)
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read config (needed for payment account details on checkout)
CREATE POLICY "Anyone can view app config"
ON public.app_config FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage app config"
ON public.app_config FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default values
INSERT INTO public.app_config (key, value) VALUES
  ('payment_accounts', '{
    "kbzpay": {"account_name": "ThweSone Co Ltd", "account_number": "09-000-000-000"},
    "wave": {"account_name": "ThweSone Co Ltd", "account_number": "09-000-000-000"},
    "wise": {"account_name": "ThweSone Co Ltd", "account_email": "payments@thwesone.com"},
    "payoneer": {"account_name": "ThweSone Co Ltd", "account_email": "payments@thwesone.com"}
  }'::jsonb),
  ('telegram_bot', '{"username": "ThweSoneBot", "url": "https://t.me/ThweSoneBot"}'::jsonb);