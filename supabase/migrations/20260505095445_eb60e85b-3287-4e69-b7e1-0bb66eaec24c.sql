UPDATE public.profiles p
SET primary_role = 'agent'
FROM public.employer_profiles e
WHERE e.id = p.id AND e.employer_type = 'agent' AND p.primary_role = 'employer';