import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, CheckCircle, MessageCircle, Star, CreditCard, Timer, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isBefore, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMentorProfile } from "@/hooks/use-mentor-data";
import { useCreateBooking } from "@/hooks/use-mentor-bookings";
import { useMentorAvailability } from "@/hooks/use-mentor-availability";
import PageHeader from "@/components/PageHeader";
import PaymentMethodSheet from "@/components/payment/PaymentMethodSheet";

const topics = [
  { my: "အသက်မွေးမှု လမ်းညွှန်", en: "Career Coaching" },
  { my: "CV စစ်ဆေး", en: "Resume Review" },
  { my: "အင်တာဗျူး ပြင်ဆင်", en: "Interview Prep" },
  { my: "နည်းပညာ လမ်းညွှန်", en: "Technical Guidance" },
  { my: "ဥပဒေ အကြံပေး", en: "Legal Advice" },
  { my: "အလုပ်လုပ်ခွင့်", en: "Work Permit" },
  { my: "အခြား", en: "Other" },
];

const durationOptions = [
  { minutes: 30, labelEn: "30 min", labelMy: "၃၀ မိနစ်" },
  { minutes: 60, labelEn: "1 hour", labelMy: "၁ နာရီ" },
  { minutes: 90, labelEn: "1.5 hours", labelMy: "၁.၅ နာရီ" },
  { minutes: 120, labelEn: "2 hours", labelMy: "၂ နာရီ" },
];

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  const suffix = hr >= 12 ? "PM" : "AM";
  const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${hr12}:${m} ${suffix}`;
}

const MentorBooking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mentorId = searchParams.get("mentorId");
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: mentorProfile } = useMentorProfile(mentorId || undefined);
  const { data: availabilitySlots = [] } = useMentorAvailability(mentorId || undefined);
  const createBooking = useCreateBooking();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [message, setMessage] = useState("");
  const [goals, setGoals] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);

  const hourlyRate = Number(mentorProfile?.hourly_rate || 0);
  const sessionAmount = hourlyRate > 0 ? (hourlyRate * selectedDuration) / 60 : 0;
  const currency = mentorProfile?.currency || "USD";

  // Dates that have available slots
  const availableDates = useMemo(() => {
    return new Set(availabilitySlots.filter(s => s.slot_date).map(s => s.slot_date!));
  }, [availabilitySlots]);

  const today = startOfDay(new Date());

  const disableDate = (date: Date) => {
    if (isBefore(date, today)) return true;
    // If no slots exist yet, allow all future dates so the user can still pick
    if (availableDates.size === 0) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return !availableDates.has(dateStr);
  };

  // Time slots for selected date
  const timeSlotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return availabilitySlots
      .filter(s => s.slot_date === dateStr && !s.is_booked)
      .map(s => ({ time: formatTime(s.start_time), raw: s.start_time, available: true }));
  }, [selectedDate, availabilitySlots]);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedDateDisplay = selectedDate ? format(selectedDate, "EEE, MMM d") : "";

  const handleConfirm = async () => {
    if (!user || !mentorId || !selectedDate || !selectedTime || !selectedTopic) return;
    try {
      await createBooking.mutateAsync({
        mentor_id: mentorId,
        mentee_id: user.id,
        scheduled_date: selectedDateStr,
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

  const mentorName = mentorProfile?.profile?.display_name || "Mentor";
  const mentorTitle = mentorProfile ? `${mentorProfile.title || ""} · ${mentorProfile.company || ""}`.replace(/^ · | · $/g, "") : "";
  const mentorTz = (mentorProfile as any)?.timezone || "Asia/Yangon";
  const durationLabel = durationOptions.find(d => d.minutes === selectedDuration);

  if (step === 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full max-w-sm flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
            <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "ချိန်းဆိုပြီးပါပြီ!" : "Booking Confirmed!"}</h1>
          <p className="mb-1 text-sm text-muted-foreground">{lang === "my" ? `${mentorName} နှင့် ချိန်းဆိုမှု` : `Session with ${mentorName}`}</p>
          <p className="mb-1 text-sm font-semibold text-foreground">{selectedDateDisplay} · {selectedTime}</p>
          <p className="mb-1 text-xs text-muted-foreground">{lang === "my" ? `အကြောင်းအရာ: ${selectedTopic}` : `Topic: ${selectedTopic}`}</p>
          <p className="mb-3 text-xs text-muted-foreground">
            {lang === "my" ? `ကြာချိန်: ${durationLabel?.labelMy}` : `Duration: ${durationLabel?.labelEn}`}
            {sessionAmount > 0 && ` · ${currency} ${sessionAmount.toFixed(2)}`}
          </p>

          {goals && (
            <div className="mb-4 w-full rounded-lg bg-muted p-3">
              <p className="text-[10px] font-medium text-muted-foreground">{lang === "my" ? "ပန်းတိုင်" : "Your Goals"}</p>
              <p className="mt-1 text-xs text-foreground">{goals}</p>
            </div>
          )}

          <div className="mb-4 w-full rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <p className="text-xs font-semibold text-foreground">{lang === "my" ? "ငွေပေးချေမှု အာမခံ" : "Payment Protection"}</p>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {lang === "my"
                ? "သင့်ငွေကို Mentor နှင့် Mentee နှစ်ဦးစလုံး Session ပြီးဆုံးကြောင်း အတည်ပြုပြီးမှသာ Mentor ထံသို့ လွှဲပြောင်းပေးပါမည်။"
                : "Your payment will only be transferred to the mentor after both mentor and mentee confirm the session is completed."}
            </p>
          </div>

          {sessionAmount > 0 && (
            <>
              <Button variant="default" size="lg" className="mb-3 w-full rounded-xl" onClick={() => setPaymentOpen(true)}>
                <CreditCard className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                {lang === "my" ? `${currency} ${sessionAmount.toFixed(2)} ပေးချေရန်` : `Pay ${currency} ${sessionAmount.toFixed(2)}`}
              </Button>
              <PaymentMethodSheet
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                amount={sessionAmount}
                currency={currency}
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
              {hourlyRate > 0 && <span className="ml-1 text-[10px] text-primary font-medium">{currency} {hourlyRate}/hr</span>}
            </div>
          </div>
        </motion.div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Calendar picker */}
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              <CalendarIcon className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
              {lang === "my" ? "ရက် ရွေးချယ်ပါ" : "Select Date"}
            </h2>
            <p className="mb-2 text-[10px] text-muted-foreground">
              {lang === "my" ? `Mentor Timezone: ${mentorTz}` : `Mentor's timezone: ${mentorTz}`}
            </p>
            <div className="mb-5 flex justify-center rounded-xl border border-border bg-card p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                disabled={disableDate}
                modifiers={{ hasSlots: (date) => availableDates.has(format(date, "yyyy-MM-dd")) }}
                modifiersClassNames={{ hasSlots: "bg-primary/10 font-bold" }}
                className={cn("pointer-events-auto")}
              />
            </div>

            {availableDates.size === 0 && (
              <p className="mb-5 text-center text-xs text-muted-foreground">
                {lang === "my" ? "ဤ Mentor တွင် ရနိုင်သော ရက် မရှိသေးပါ" : "This mentor hasn't set any available dates yet"}
              </p>
            )}

            {/* Time slots */}
            {selectedDate && (
              <>
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  <Clock className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
                  {lang === "my" ? "အချိန် ရွေးချယ်ပါ" : "Select Time"}
                  <span className="ml-1 text-xs text-muted-foreground">{selectedDateDisplay}</span>
                </h2>
                {timeSlotsForDate.length > 0 ? (
                  <div className="mb-5 grid grid-cols-3 gap-2">
                    {timeSlotsForDate.map(slot => (
                      <button
                        key={slot.raw}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`rounded-xl border p-3 text-center text-sm font-medium transition-all ${
                          selectedTime === slot.time
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground active:bg-muted"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mb-5 text-center text-xs text-muted-foreground">
                    {lang === "my" ? "ဤနေ့တွင် အချိန်မရှိပါ" : "No available time slots for this day"}
                  </p>
                )}
              </>
            )}

            {/* Duration */}
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              <Timer className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
              {lang === "my" ? "ကြာချိန် ရွေးချယ်ပါ" : "Select Duration"}
            </h2>
            <div className="mb-2 grid grid-cols-4 gap-2">
              {durationOptions.map(opt => (
                <button key={opt.minutes} onClick={() => setSelectedDuration(opt.minutes)} className={`rounded-xl border p-3 text-center transition-all ${selectedDuration === opt.minutes ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground active:bg-muted"}`}>
                  <p className="text-xs font-medium">{lang === "my" ? opt.labelMy : opt.labelEn}</p>
                </button>
              ))}
            </div>
            {hourlyRate > 0 && (
              <p className="mb-5 text-xs text-muted-foreground text-center">
                {lang === "my"
                  ? `Session ကြေး: ${currency} ${sessionAmount.toFixed(2)}`
                  : `Session fee: ${currency} ${sessionAmount.toFixed(2)}`}
              </p>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-5 rounded-xl border border-border bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">{lang === "my" ? "ရွေးချယ်ထားသော အချိန်" : "Selected"}</p>
              <p className="text-sm font-semibold text-foreground">{selectedDateDisplay} · {selectedTime} · {durationLabel ? (lang === "my" ? durationLabel.labelMy : durationLabel.labelEn) : ""}</p>
              {sessionAmount > 0 && <p className="mt-0.5 text-xs text-primary font-medium">{currency} {sessionAmount.toFixed(2)}</p>}
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
            <Button variant="default" size="lg" className="w-full rounded-xl" disabled={!selectedDate || !selectedTime} onClick={() => setStep(2)}>
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
