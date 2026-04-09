
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''), NEW.email);

  -- Send welcome notification
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
$$;
