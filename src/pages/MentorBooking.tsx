import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, CheckCircle, MessageCircle, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";

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

  const handleConfirm = () => setStep(3);

  if (step === 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
            <CheckCircle className="h-10 w-10 text-emerald" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "ချိန်းဆိုပြီးပါပြီ!" : "Booking Confirmed!"}</h1>
          <p className="mb-1 text-sm text-muted-foreground">{lang === "my" ? "ဒေါ်ခင်မြတ်နိုး နှင့် ချိန်းဆိုမှု" : "Session with Khin Myat Noe"}</p>
          <p className="mb-1 text-sm font-semibold text-foreground">{selectedDay} · {selectedTime} (SGT)</p>
          <p className="mb-6 text-xs text-muted-foreground">{lang === "my" ? `အကြောင်းအရာ: ${selectedTopic}` : `Topic: ${selectedTopic}`}</p>
          <p className="mb-8 text-xs text-muted-foreground">
            {lang === "my" ? "အတည်ပြုချက် အီးမေးလ် ပို့ပြီးပါပြီ" : "Confirmation email has been sent"}
          </p>
          <Button variant="gold" size="lg" className="mb-3 w-full rounded-xl" onClick={() => navigate("/messages/chat")}>
            <MessageCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "Mentor ကို မက်ဆေ့ချ် ပို့ရန်" : "Message Mentor"}
          </Button>
          <Button variant="outline" size="lg" className="w-full rounded-xl" onClick={() => navigate("/mentors")}>
            {lang === "my" ? "Mentors သို့ ပြန်သွားရန်" : "Back to Mentors"}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-6">
        <div className="mb-5 flex items-center gap-3">
          <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "ချိန်းဆိုရန်" : "Book Session"}</h1>
        </div>

        {/* Progress */}
        <div className="mb-6 flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-gradient-gold" : "bg-muted"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-gradient-gold" : "bg-muted"}`} />
        </div>

        {/* Mentor card mini */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary-foreground">KM</div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "ဒေါ်ခင်မြတ်နိုး" : "Khin Myat Noe"}</h3>
            <p className="text-xs text-muted-foreground">Senior Software Engineer · Grab</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span className="text-[11px] font-medium text-foreground">4.9</span>
              <span className="text-[10px] text-muted-foreground">(47)</span>
            </div>
          </div>
        </motion.div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Day selection */}
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              <Calendar className="mr-1.5 inline h-4 w-4 text-primary" />
              {lang === "my" ? "ရက် ရွေးချယ်ပါ" : "Select Day"}
            </h2>
            <div className="mb-5 grid grid-cols-4 gap-2">
              {days.map(d => (
                <button key={d.date} onClick={() => setSelectedDay(d.date)} className={`rounded-xl p-3 text-center transition-all ${selectedDay === d.date ? "bg-primary text-primary-foreground shadow-gold" : "bg-card shadow-card text-foreground"}`}>
                  <p className="text-[10px] text-inherit opacity-70">{lang === "my" ? d.day.my : d.day.en}</p>
                  <p className="text-sm font-semibold">{d.date.split(" ")[1]}</p>
                </button>
              ))}
            </div>

            {/* Time selection */}
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              <Clock className="mr-1.5 inline h-4 w-4 text-primary" />
              {lang === "my" ? "အချိန် ရွေးချယ်ပါ" : "Select Time"} <span className="text-xs text-muted-foreground">(SGT)</span>
            </h2>
            <div className="mb-5 grid grid-cols-3 gap-2">
              {timeSlots.map(slot => (
                <button key={slot.time} disabled={!slot.available} onClick={() => setSelectedTime(slot.time)} className={`rounded-xl p-3 text-center text-sm font-medium transition-all ${!slot.available ? "bg-muted text-muted-foreground/40 cursor-not-allowed" : selectedTime === slot.time ? "bg-primary text-primary-foreground shadow-gold" : "bg-card shadow-card text-foreground"}`}>
                  {slot.time}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Selected date/time summary */}
            <div className="mb-5 rounded-xl bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">{lang === "my" ? "ရွေးချယ်ထားသော အချိန်" : "Selected"}</p>
              <p className="text-sm font-semibold text-foreground">{selectedDay} · {selectedTime} (SGT)</p>
            </div>

            {/* Topic */}
            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "အကြောင်းအရာ ရွေးချယ်ပါ" : "Select Topic"}</h2>
            <div className="mb-5 flex flex-wrap gap-2">
              {topics.map(t => (
                <button key={t.en} onClick={() => setSelectedTopic(lang === "my" ? t.my : t.en)} className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${selectedTopic === (lang === "my" ? t.my : t.en) ? "bg-primary text-primary-foreground shadow-gold" : "bg-card text-muted-foreground shadow-card"}`}>
                  {lang === "my" ? t.my : t.en}
                </button>
              ))}
            </div>

            {/* Message */}
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "မက်ဆေ့ချ် (ရွေးချယ်ပိုင်ခွင့်)" : "Message (Optional)"}</h2>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={lang === "my" ? "Mentor ကို ကြိုတင် ပြောလိုသည့် အကြောင်းအရာ..." : "Anything you'd like to discuss in advance..."} className="min-h-[80px] rounded-xl border-border bg-card text-sm" />
          </motion.div>
        )}
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 py-3 backdrop-blur-lg pb-safe">
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
