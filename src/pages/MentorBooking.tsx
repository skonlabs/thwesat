import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, MessageCircle, Star, CreditCard } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMentorProfile } from "@/hooks/use-mentor-data";
import { useCreateBooking } from "@/hooks/use-mentor-bookings";
import PageHeader from "@/components/PageHeader";
import PaymentMethodSheet from "@/components/payment/PaymentMethodSheet";

const timeSlots = [
  { time: "7:00 PM", available: true },
  { time: "7:30 PM", available: true },
  { time: "8:00 PM", available: false },
  { time: "8:30 PM", available: true },
  { time: "9:00 PM", available: true },
];

const topics = [
  { my: "အသက်မွေးမှု လမ်းညွှန်", en: "Career Coaching" },
  { my: "CV စစ်ဆေး", en: "Resume Review" },
  { my: "အင်တာဗျူး ပြင်ဆင်", en: "Interview Prep" },
  { my: "နည်းပညာ လမ်းညွှန်", en: "Technical Guidance" },
  { my: "ဥပဒေ အကြံပေး", en: "Legal Advice" },
  { my: "အလုပ်လုပ်ခွင့်", en: "Work Permit" },
  { my: "အခြား", en: "Other" },
];

const MentorBooking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mentorId = searchParams.get("mentorId");
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: mentorProfile } = useMentorProfile(mentorId || undefined);
  const createBooking = useCreateBooking();

  const [step, setStep] = useState(1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [goals, setGoals] = useState("");
  const [rating, setRating] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Generate next available days dynamically
  const getNextDays = () => {
    const availableDays = mentorProfile?.available_days || [];
    const dayNames: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    const dayLabels: Record<string, { my: string; en: string }> = {
      Sunday: { my: "တနင်္ဂနွေ", en: "Sun" }, Monday: { my: "တနင်္လာ", en: "Mon" },
      Tuesday: { my: "အင်္ဂါ", en: "Tue" }, Wednesday: { my: "ဗုဒ္ဓဟူး", en: "Wed" },
      Thursday: { my: "ကြာသပတေး", en: "Thu" }, Friday: { my: "သောကြာ", en: "Fri" },
      Saturday: { my: "စနေ", en: "Sat" },
    };
    const result: { date: string; day: { my: string; en: string }; dateStr: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= 30 && result.length < 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = Object.keys(dayNames).find(k => dayNames[k] === d.getDay()) || "";
      if (availableDays.length === 0 || availableDays.includes(dayName)) {
        const label = dayLabels[dayName] || { my: dayName.slice(0, 3), en: dayName.slice(0, 3) };
        result.push({
          date: `${label.en} ${d.getDate()}`,
          day: label,
          dateStr: d.toISOString().split("T")[0],
        });
      }
    }
    return result;
  };

  const days = getNextDays();

  const handleConfirm = async () => {
    if (!user || !mentorId || !selectedDay || !selectedTime || !selectedTopic) return;
    const dayInfo = days.find(d => d.date === selectedDay);
    try {
      await createBooking.mutateAsync({
        mentor_id: mentorId,
        mentee_id: user.id,
        scheduled_date: dayInfo?.dateStr || selectedDay,
        scheduled_time: selectedTime,
        topic: selectedTopic,
        message,
        goals,
        booked_by: "mentee",
      });
      setStep(3);
    } catch {
      toast({
        title: lang === "my" ? "အမှား" : "Error",
        description: lang === "my" ? "ချိန်းဆိုမှု မအောင်မြင်ပါ" : "Failed to create booking",
        variant: "destructive",
      });
    }
  };

  const mentorName = mentorProfile?.profile?.display_name || (lang === "my" ? "Mentor" : "Mentor");
  const mentorTitle = mentorProfile ? `${mentorProfile.title || ""} · ${mentorProfile.company || ""}`.replace(/^ · | · $/g, "") : "";

  if (step === 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full max-w-sm flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
            <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "ချိန်းဆိုပြီးပါပြီ!" : "Booking Confirmed!"}</h1>
          <p className="mb-1 text-sm text-muted-foreground">{lang === "my" ? `${mentorName} နှင့် ချိန်းဆိုမှု` : `Session with ${mentorName}`}</p>
          <p className="mb-1 text-sm font-semibold text-foreground">{selectedDay} · {selectedTime} (SGT)</p>
          <p className="mb-2 text-xs text-muted-foreground">{lang === "my" ? `အကြောင်းအရာ: ${selectedTopic}` : `Topic: ${selectedTopic}`}</p>
          {goals && (
            <div className="mb-4 w-full rounded-lg bg-muted p-3">
              <p className="text-[10px] font-medium text-muted-foreground">{lang === "my" ? "ပန်းတိုင်" : "Your Goals"}</p>
              <p className="mt-1 text-xs text-foreground">{goals}</p>
            </div>
          )}

          <div className="mb-4 w-full rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "Session ကို အမှတ်ပေးပါ" : "Rate this session"}</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star className={`h-8 w-8 ${star <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} strokeWidth={1.5} />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                {rating >= 4 ? (lang === "my" ? "ကျေးဇူးတင်ပါသည်!" : "Thank you!") : (lang === "my" ? "တုံ့ပြန်ချက် မှတ်တမ်းတင်ပြီးပါပြီ" : "Feedback recorded")}
              </p>
            )}
          </div>

          {mentorProfile?.hourly_rate && Number(mentorProfile.hourly_rate) > 0 && (
            <>
              <Button variant="default" size="lg" className="mb-3 w-full rounded-xl" onClick={() => setPaymentOpen(true)}>
                <CreditCard className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                {lang === "my" ? "Session ကြေး ပေးချေရန်" : "Pay Session Fee"}
              </Button>
              <PaymentMethodSheet
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                amount={Number(mentorProfile.hourly_rate)}
                currency={mentorProfile.currency || "USD"}
                paymentType="mentor_session"
                referenceId={mentorId || undefined}
                onSuccess={() => setPaymentOpen(false)}
              />
            </>
          )}
          <p className="mb-6 text-xs text-muted-foreground">
            {lang === "my" ? "အတည်ပြုချက် အီးမေးလ် ပို့ပြီးပါပြီ" : "Confirmation email has been sent"}
          </p>
          <Button variant="default" size="lg" className="mb-3 w-full rounded-xl" onClick={() => navigate("/messages")}>
            <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "Mentor ကို မက်ဆေ့ချ် ပို့ရန်" : "Message Mentor"}
          </Button>
          <Button variant="outline" size="lg" className="w-full rounded-xl" onClick={() => navigate("/mentors")}>
            {lang === "my" ? "Mentors သို့ ပြန်သွားရန်" : "Back to Mentors"}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <PageHeader title={lang === "my" ? "ချိန်းဆိုရန်" : "Book Session"} />

      <div className="px-5">
        <div className="mb-6 flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {mentorName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{mentorName}</h3>
            {mentorTitle && <p className="text-xs text-muted-foreground">{mentorTitle}</p>}
            <div className="mt-0.5 flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span className="text-[11px] font-medium text-foreground">{mentorProfile?.rating_avg || 0}</span>
              <span className="text-[10px] text-muted-foreground">({mentorProfile?.total_sessions || 0})</span>
            </div>
          </div>
        </motion.div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              <Calendar className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
              {lang === "my" ? "ရက် ရွေးချယ်ပါ" : "Select Day"}
            </h2>
            <div className="mb-5 grid grid-cols-4 gap-2">
              {days.map(d => (
                <button key={d.date} onClick={() => setSelectedDay(d.date)} className={`rounded-xl border p-3 text-center transition-all ${selectedDay === d.date ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground active:bg-muted"}`}>
                  <p className="text-[10px] opacity-70">{lang === "my" ? d.day.my : d.day.en}</p>
                  <p className="text-sm font-semibold">{d.date.split(" ")[1]}</p>
                </button>
              ))}
            </div>

            <h2 className="mb-3 text-sm font-semibold text-foreground">
              <Clock className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
              {lang === "my" ? "အချိန် ရွေးချယ်ပါ" : "Select Time"} <span className="text-xs text-muted-foreground">(SGT)</span>
            </h2>
            <div className="mb-5 grid grid-cols-3 gap-2">
              {timeSlots.map(slot => (
                <button key={slot.time} disabled={!slot.available} onClick={() => setSelectedTime(slot.time)} className={`rounded-xl border p-3 text-center text-sm font-medium transition-all ${!slot.available ? "border-border bg-muted text-muted-foreground/40 cursor-not-allowed" : selectedTime === slot.time ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground active:bg-muted"}`}>
                  {slot.time}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-5 rounded-xl border border-border bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">{lang === "my" ? "ရွေးချယ်ထားသော အချိန်" : "Selected"}</p>
              <p className="text-sm font-semibold text-foreground">{selectedDay} · {selectedTime} (SGT)</p>
            </div>

            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "အကြောင်းအရာ ရွေးချယ်ပါ" : "Select Topic"}</h2>
            <div className="mb-5 flex flex-wrap gap-2">
              {topics.map(t => (
                <button key={t.en} onClick={() => setSelectedTopic(lang === "my" ? t.my : t.en)} className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${selectedTopic === (lang === "my" ? t.my : t.en) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground active:bg-muted"}`}>
                  {lang === "my" ? t.my : t.en}
                </button>
              ))}
            </div>

            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ပန်းတိုင် / ရည်ရွယ်ချက်" : "Your Goals"}</h2>
            <Textarea value={goals} onChange={e => setGoals(e.target.value)} placeholder={lang === "my" ? "ဤ Session မှ ဘာရယူချင်ပါသလဲ?" : "What do you want to achieve from this session?"} className="mb-4 min-h-[60px] rounded-xl border-border bg-card text-sm" />

            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "မက်ဆေ့ချ် (ရွေးချယ်ပိုင်ခွင့်)" : "Message (Optional)"}</h2>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={lang === "my" ? "Mentor ကို ကြိုတင် ပြောလိုသည့် အကြောင်းအရာ..." : "Anything you'd like to discuss in advance..."} className="min-h-[60px] rounded-xl border-border bg-card text-sm" />
          </motion.div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-lg">
        <div className="mx-auto max-w-lg">
          {step === 1 ? (
            <Button variant="default" size="lg" className="w-full rounded-xl" disabled={!selectedDay || !selectedTime} onClick={() => setStep(2)}>
              {lang === "my" ? "ဆက်လက်ရန်" : "Continue"}
            </Button>
          ) : (
            <Button variant="default" size="lg" className="w-full rounded-xl" disabled={!selectedTopic || createBooking.isPending} onClick={handleConfirm}>
              {createBooking.isPending ? (lang === "my" ? "ချိန်းဆိုနေသည်..." : "Booking...") : (lang === "my" ? "ချိန်းဆိုမှု အတည်ပြုရန်" : "Confirm Booking")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MentorBooking;
