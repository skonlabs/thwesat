
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL,
  country text NOT NULL DEFAULT 'default',
  duration_months integer,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  name_en text NOT NULL DEFAULT '',
  name_my text NOT NULL DEFAULT '',
  badge_en text,
  badge_my text,
  save_label_en text,
  save_label_my text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, country)
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also allow anon users to view plans (for pre-login premium page)
CREATE POLICY "Public can view active plans"
  ON public.subscription_plans
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Seed default (USD) plans
INSERT INTO public.subscription_plans (plan_id, country, duration_months, price, currency, name_en, name_my, badge_en, badge_my, save_label_en, save_label_my, sort_order) VALUES
  ('free', 'default', NULL, 0, 'USD', 'Free', 'အခမဲ့', NULL, NULL, NULL, NULL, 0),
  ('3mo', 'default', 3, 15, 'USD', '3 Months', '၃ လ', NULL, NULL, NULL, NULL, 1),
  ('6mo', 'default', 6, 25, 'USD', '6 Months', '၆ လ', 'Popular', 'လူကြိုက်များ', 'Save 17%', '17% သက်သာ', 2),
  ('12mo', 'default', 12, 45, 'USD', '12 Months', '၁၂ လ', 'Best Value', 'တန်ဖိုးအရှိဆုံး', 'Save 25%', '25% သက်သာ', 3);

-- Seed Myanmar-specific plans (MMK)
INSERT INTO public.subscription_plans (plan_id, country, duration_months, price, currency, name_en, name_my, badge_en, badge_my, save_label_en, save_label_my, sort_order) VALUES
  ('free', 'MM', NULL, 0, 'MMK', 'Free', 'အခမဲ့', NULL, NULL, NULL, NULL, 0),
  ('3mo', 'MM', 3, 60000, 'MMK', '3 Months', '၃ လ', NULL, NULL, NULL, NULL, 1),
  ('6mo', 'MM', 6, 100000, 'MMK', '6 Months', '၆ လ', 'Popular', 'လူကြိုက်များ', 'Save 17%', '17% သက်သာ', 2),
  ('12mo', 'MM', 12, 180000, 'MMK', '12 Months', '၁၂ လ', 'Best Value', 'တန်ဖိုးအရှိဆုံး', 'Save 25%', '25% သက်သာ', 3);
