ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_primary_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_primary_role_check
  CHECK (primary_role IN ('jobseeker','employer','agent','mentor'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text := COALESCE(NEW.raw_user_meta_data->>'primary_role', 'jobseeker');
BEGIN
  IF v_role NOT IN ('jobseeker','employer','agent','mentor') THEN
    v_role := 'jobseeker';
  END IF;

  INSERT INTO public.profiles (id, display_name, email, primary_role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''), NEW.email, v_role);

  INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (
    NEW.id,
    'system',
    '👋 Welcome to ThweSone!',
    '👋 ThweSone မှ ကြိုဆိုပါသည်!',
    'Complete your profile to get started. Explore jobs, connect with mentors, and join our community.',
    'စတင်ရန် သင့်ပရိုဖိုင်ကို ဖြည့်စွက်ပါ။ အလုပ်များရှာဖွေ၊ Mentor များနှင့် ချိတ်ဆက်ပြီး ကျွန်ုပ်တို့ community တွင် ပါဝင်ပါ။',
    '/profile'
  );

  RETURN NEW;
END;
$function$;

UPDATE public.profiles p
SET primary_role='agent'
FROM public.employer_profiles e
WHERE e.id=p.id AND e.employer_type='agent' AND p.primary_role <> 'agent';