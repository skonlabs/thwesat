ALTER TABLE public.profiles ALTER COLUMN visibility SET DEFAULT 'public';
UPDATE public.profiles SET visibility = 'public' WHERE visibility = 'members' OR visibility IS NULL;