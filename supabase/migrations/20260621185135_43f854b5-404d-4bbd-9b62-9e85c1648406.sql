-- Update Job Seeker top-up packages to new discount model (same credits, lower price)
UPDATE public.credit_packages SET price_mmk = 5000,  credits = 5000,  bonus_credits = 0 WHERE name_en = 'Starter';
UPDATE public.credit_packages SET price_mmk = 9500,  credits = 10000, bonus_credits = 0 WHERE name_en = 'Popular';
UPDATE public.credit_packages SET price_mmk = 22500, credits = 25000, bonus_credits = 0 WHERE name_en = 'Value';
UPDATE public.credit_packages SET price_mmk = 42500, credits = 50000, bonus_credits = 0 WHERE name_en = 'Power';

-- Remove Career Track Enrollment as a paid action for Job Seekers
UPDATE public.career_tracks SET is_active = false;
DELETE FROM public.action_prices WHERE action_key = 'career_track';