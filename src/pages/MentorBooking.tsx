import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, MessageCircle, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const timeSlots = [
  { time: "7:00 PM", available: true },
  { time: "7:30 PM", available: true },
  { time: "8:00 PM", available: false },
  { time: "8:30 PM", available: true },
  { time: "9:00 PM", available: true },
];

const topics = [
  { my: "Career Coaching", en: "Career Coaching" },
  { my: "Resume Review", en: "Resume Review" },
  { my: "Interview Prep", en: "Interview Prep" },
  { my: "Technical Guidance", en: "Technical Guidance" },
  { my: "အခြား", en: "Other" },
];

const days = [
  { date: "Mon 31", day: { my: "တနင်္လာ", en: "Mon" }, available: true },
  { date: "Wed 2", day: { my: "ဗုဒ္ဓဟူး", en: "Wed" }, available: true },
  { date: "Sat 5", day: { my: "စနေ", en: "Sat" }, available: true },
  { date: "Sun 6", day: { my: "တနင်္ဂနွေ", en: "Sun" }, available: true },
];

const MentorBooking = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [step, setStep] = useState(1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [goals, setGoals] = useState("");
  const [rating, setRating] = useState(0);

  const handleConfirm = () => setStep(3);

  // Confirmation + Rating screen
  if (step === 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full max-w-sm flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
            <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "ချိန်းဆိုပြီးပါပြီ!" : "Booking Confirmed!"}</h1>
          <p className="mb-1 text-sm text-muted-foreground">{lang === "my" ? "ဒေါ်ခင်မြတ်နိုး နှင့် ချိန်းဆိုမှု" : "Session with Khin Myat Noe"}</p>
          <p className="mb-1 text-sm font-semibold text-foreground">{selectedDay} · {selectedTime} (SGT)</p>
          <p className="mb-2 text-xs text-muted-foreground">{lang === "my" ? `အကြောင်းအရာ: ${selectedTopic}` : `Topic: ${selectedTopic}`}</p>
          {goals && (
            <div className="mb-4 w-full rounded-lg bg-muted p-3">
              <p className="text-[10px] font-medium text-muted-foreground">{lang === "my" ? "ပန်းတိုင်" : "Your Goals"}</p>
              <p className="mt-1 text-xs text-foreground">{goals}</p>
            </div>
          )}

          {/* Session rating (post-session mock) */}
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

          <p className="mb-6 text-xs text-muted-foreground">
            {lang === "my" ? "အတည်ပြုချက် အီးမေးလ် ပို့ပြီးပါပြီ" : "Confirmation email has been sent"}
          </p>
          <Button variant="gold" size="lg" className="mb-3 w-full rounded-xl" onClick={() => navigate("/messages/chat")}>
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">KM</div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "ဒေါ်ခင်မြတ်နိုး" : "Khin Myat Noe"}</h3>
            <p className="text-xs text-muted-foreground">Senior Software Engineer · Grab</p>
            <div className="mt-0.5 flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span className="text-[11px] font-medium text-foreground">4.9</span>
              <span className="text-[10px] text-muted-foreground">(47)</span>
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
            <Button variant="gold" size="lg" className="w-full rounded-xl" disabled={!selectedDay || !selectedTime} onClick={() => setStep(2)}>
              {lang === "my" ? "ဆက်လက်ရန်" : "Continue"}
            </Button>
          ) : (
            <Button variant="gold" size="lg" className="w-full rounded-xl" disabled={!selectedTopic} onClick={handleConfirm}>
              {lang === "my" ? "ချိန်းဆိုမှု အတည်ပြုရန်" : "Confirm Booking"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MentorBooking;
