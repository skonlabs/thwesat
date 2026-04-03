UPDATE public.mentor_profiles mp
SET 
  title = COALESCE(NULLIF(p.headline, ''), mp.title),
  bio = COALESCE(NULLIF(p.bio, ''), mp.bio),
  expertise = CASE WHEN array_length(p.skills, 1) > 0 THEN p.skills ELSE mp.expertise END,
  location = COALESCE(NULLIF(p.location, ''), mp.location)
FROM public.profiles p
WHERE mp.id = p.id
  AND p.primary_role = 'mentor'
  AND (mp.title IS NULL OR mp.title = '');