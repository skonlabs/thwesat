
-- Update mentor profile with rich data
UPDATE public.mentor_profiles
SET bio = 'Senior software engineer with 10+ years of experience at companies like Google and Grab. Passionate about helping Myanmar tech talent break into the global market. Specialized in system design, career strategy, and technical interview preparation.',
    bio_my = 'Google နှင့် Grab ကဲ့သို့ ကုမ္ပဏီများတွင် ၁၀နှစ်ကျော် အတွေ့အကြုံရှိ Senior Software Engineer။ မြန်မာ tech talent များကို ကမ္ဘာ့စျေးကွက်သို့ ဝင်ရောက်ရာတွင် ကူညီရန် စိတ်အားထက်သန်ပါသည်။',
    title = 'Senior Software Engineer',
    company = 'Ex-Google, Ex-Grab',
    expertise = ARRAY['System Design', 'Career Strategy', 'Technical Interviews', 'React', 'Node.js', 'Cloud Architecture'],
    location = 'Singapore',
    hourly_rate = 25,
    currency = 'USD',
    available_days = ARRAY['Monday', 'Wednesday', 'Friday', 'Saturday'],
    is_available = true,
    total_sessions = 48,
    total_mentees = 15,
    rating_avg = 4.8
WHERE id = '34bb0894-953a-41ba-8043-d036bf753663';

-- Save some jobs for the main jobseeker (b4b33206)
INSERT INTO public.saved_jobs (user_id, job_id)
VALUES
  ('b4b33206-4236-4ee8-ba05-2c982f1e755e', '7252f48a-d147-4272-aa40-a4d2e5826894'),
  ('b4b33206-4236-4ee8-ba05-2c982f1e755e', '93390afe-1603-4ede-b79c-416ebdcd160d'),
  ('b4b33206-4236-4ee8-ba05-2c982f1e755e', 'e0346c75-4255-4038-97fb-1ddf56d8bd36'),
  ('b4b33206-4236-4ee8-ba05-2c982f1e755e', '507b276b-8c4c-4e21-bc47-76dd87d72f49'),
  ('34bb0894-953a-41ba-8043-d036bf753663', 'f592e961-7595-4acf-983f-3228920d507e'),
  ('34bb0894-953a-41ba-8043-d036bf753663', '6b57b3e4-dc74-40fb-b17a-10733873d4dd');

-- Create guides with valid categories
INSERT INTO public.guides (title, title_my, content, content_my, category, country, country_flag, read_time_minutes, is_verified, is_new, verified_by)
VALUES
  ('How to Get a Work Permit in Thailand', 'ထိုင်းနိုင်ငံတွင် အလုပ်လုပ်ခွင့်ပါမစ် ရယူနည်း', E'## Step-by-Step Guide to Thai Work Permits\n\nGetting a work permit in Thailand requires several steps:\n\n### 1. Secure a Job Offer\nYou need a formal job offer from a Thai employer before applying.\n\n### 2. Get a Non-Immigrant B Visa\nApply at the Thai embassy in your country with your job offer letter.\n\n### 3. Documents Required\n- Valid passport (6+ months)\n- Job offer letter\n- Company registration documents\n- Medical certificate\n- Educational certificates\n\n### 4. Apply for Work Permit\nOnce in Thailand, your employer submits the application to the Department of Employment.\n\n### 5. Processing Time\nTypically 7-15 business days.', E'## ထိုင်းအလုပ်လုပ်ခွင့်ပါမစ် အဆင့်ဆင့်လမ်းညွှန်\n\nထိုင်းနိုင်ငံတွင် အလုပ်လုပ်ခွင့်ပါမစ် ရယူရန် အဆင့်များစွာ လိုအပ်ပါသည်။', 'visa', 'Thailand', '🇹🇭', 8, true, true, 'ThweSone Team'),

  ('Avoid Job Scams: Red Flags to Watch For', 'အလုပ်လိမ်လည်မှုများကို ရှောင်ကြဉ်ရန် သတိပြုရမည့်အချက်များ', E'## Protecting Yourself from Job Scams\n\n### Red Flags\n- **Upfront fees**: Legitimate employers never ask you to pay for a job\n- **Too good to be true salary**: Be skeptical of unusually high pay\n- **Vague job descriptions**: Real jobs have clear responsibilities\n- **Pressure to decide quickly**: Scammers create urgency\n- **No contract**: Always insist on a written contract\n\n### How to Verify\n1. Research the company online\n2. Check with the Myanmar embassy\n3. Ask for references from current workers\n4. Verify through ThweSone community', E'## အလုပ်လိမ်လည်မှုများမှ ကိုယ့်ကိုယ်ကို ကာကွယ်ခြင်း\n\nပြည်ပရောက် မြန်မာအလုပ်သမားများသည် လိမ်လည်မှု အန္တရာယ်များစွာ ရင်ဆိုင်ရပါသည်။', 'safety', '', '🛡️', 5, true, false, 'ThweSone Team'),

  ('Setting Up Wise for International Payments', 'နိုင်ငံတကာ ငွေလွှဲမှုအတွက် Wise သုံးနည်း', E'## Complete Guide to Wise\n\n### What is Wise?\nWise is a popular international money transfer service with low fees and real exchange rates.\n\n### Setting Up Your Account\n1. Visit wise.com or download the app\n2. Sign up with your email\n3. Verify your identity\n4. Add your bank account\n\n### Tips for Myanmar Workers\n- Use the multi-currency account\n- Compare rates before converting to MMK\n- Set up rate alerts for better exchange rates', E'## Wise အသုံးပြုနည်း လမ်းညွှန်\n\nWise သည် နိမ့်သော အခကြေးငွေနှင့် လူကြိုက်များသော နိုင်ငံတကာ ငွေလွှဲဝန်ဆောင်မှုတစ်ခု ဖြစ်ပါသည်။', 'finance', '', '💰', 6, true, true, 'ThweSone Team'),

  ('Remote Work Essentials: Getting Started', 'အဝေးမှ အလုပ်လုပ်ခြင်း မရှိမဖြစ်လိုအပ်ချက်များ', E'## Your Guide to Remote Work Success\n\n### Hardware Requirements\n- Reliable laptop (8GB+ RAM recommended)\n- Good quality headset with microphone\n- Webcam for video calls\n- Backup power solution\n\n### Internet Setup\n- Minimum 10 Mbps download speed\n- Have a backup internet connection\n\n### Building Good Habits\n- Set a consistent schedule\n- Create a dedicated workspace\n- Communicate proactively', E'## အဝေးမှ အလုပ်လုပ်ခြင်း အောင်မြင်ရေး လမ်းညွှန်', 'employment', '', '🏠', 7, true, false, 'ThweSone Team'),

  ('Working in Singapore: A Complete Guide', 'စင်္ကာပူတွင် အလုပ်လုပ်ခြင်း လမ်းညွှန်', E'## Everything About Working in Singapore\n\n### Visa Types\n- **Employment Pass (EP)**: For professionals earning S$5,000+/month\n- **S Pass**: For mid-skilled workers earning S$3,150+/month\n- **Work Permit**: For semi-skilled workers\n\n### Cost of Living\n- Rent: S$500-1,500/month (shared)\n- Food: S$300-500/month\n- Transport: S$100-150/month', E'## စင်္ကာပူတွင် အလုပ်လုပ်ခြင်းအကြောင်း သိထားရမည့်အရာအားလုံး', 'visa', 'Singapore', '🇸🇬', 10, true, true, 'ThweSone Team'),

  ('How to Build a Strong Upwork Profile', 'Upwork Profile ကောင်းကောင်း တည်ဆောက်နည်း', E'## Building Your Freelance Career on Upwork\n\n### Profile Setup\n1. Use a professional photo\n2. Write a compelling headline\n3. Create a detailed overview\n4. Set competitive rates\n\n### Getting Your First Client\n- Apply to 10-20 jobs daily\n- Write personalized proposals\n- Start with smaller projects\n- Deliver exceptional quality', E'## Upwork တွင် Freelance Career တည်ဆောက်ခြင်း', 'employment', '', '💼', 8, true, false, 'ThweSone Team');

-- Create community posts
INSERT INTO public.community_posts (author_id, content_my, content_en, category, is_approved, likes_count)
VALUES
  ('b4b33206-4236-4ee8-ba05-2c982f1e755e', 'စင်္ကာပူမှာ React Developer အလုပ်ရပြီ! ThweSone ကနေ အကူအညီရခဲ့တဲ့အတွက် ကျေးဇူးတင်ပါတယ်။', 'Got a React Developer job in Singapore! Thanks to ThweSone for the help.', 'success-story', true, 12),
  ('34bb0894-953a-41ba-8043-d036bf753663', 'မြန်မာ developer တွေအတွက် technical interview tips မျှဝေပါရစေ။', 'Sharing technical interview tips for Myanmar developers.', 'tips', true, 25),
  ('b4b33206-4236-4ee8-ba05-2c982f1e755e', 'Wise account ဖွင့်ရတာ မြန်မာနိုင်ငံသားတွေအတွက် ခက်ခဲတယ်ဆိုတဲ့ သူငယ်ချင်းတွေအတွက် - ထိုင်းမှာ ဖွင့်လို့ရပါတယ်။', 'For friends having difficulty opening Wise as Myanmar citizens - you can open one in Thailand.', 'tips', true, 18),
  ('34bb0894-953a-41ba-8043-d036bf753663', 'ဒီအပတ် free mentoring session ရှိပါတယ်! React နဲ့ Node.js အကြောင်း မေးခွန်းရှိရင် booking လုပ်ပါ။', 'Free mentoring session this week! Book if you have React/Node.js questions.', 'announcement', true, 30);

-- Create sample applications
INSERT INTO public.applications (applicant_id, job_id, status, cover_letter)
VALUES
  ('b4b33206-4236-4ee8-ba05-2c982f1e755e', '7252f48a-d147-4272-aa40-a4d2e5826894', 'applied', 'I am excited to apply for the React Frontend Developer position at TechBridge Myanmar.'),
  ('b4b33206-4236-4ee8-ba05-2c982f1e755e', '507b276b-8c4c-4e21-bc47-76dd87d72f49', 'interview', 'I would like to apply for the Virtual Assistant position at GoldenLand Outsourcing.');
