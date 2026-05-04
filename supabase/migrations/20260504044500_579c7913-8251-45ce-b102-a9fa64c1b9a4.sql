INSERT INTO public.action_prices (action_key,label_en,label_my,description_en,description_my,price_credits,duration_days,is_active)
VALUES ('cover_letter','Cover Letter','အလုပ်လျှောက်လွှာ','Generate a tailored cover letter and save to your library','သင့်အတွက် အလုပ်လျှောက်လွှာ ဖန်တီးပြီး သိမ်းဆည်းမည်',500,NULL,true)
ON CONFLICT (action_key) DO NOTHING;