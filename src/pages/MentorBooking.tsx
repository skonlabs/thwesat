import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, CheckCircle, MessageCircle, Star, CreditCard, Timer, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isBefore, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMentorProfile } from "@/hooks/use-mentor-data";
import { useCreateBooking } from "@/hooks/use-mentor-bookings";
import { useMentorAvailability } from "@/hooks/use-mentor-availability";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { useUserRoles } from "@/hooks/use-user-roles";
import PageHeader from "@/components/PageHeader";
import { useWallet, useActionPrice, useCreditPackages } from "@/hooks/use-wallet";
import TopupSheet from "@/components/wallet/TopupSheet";
import { Coins } from "lucide-react";

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
  { minutes: 15, labelEn: "15 min", labelMy: "၁၅ မိနစ်" },
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
  const { data: mentorProfile, isLoading: mentorLoading } = useMentorProfile(mentorId || undefined);
  // Fallback profile lookup for the case where current user is a mentor booking
  // a non-mentor (no mentor_profiles row exists for the target).
  const { data: fallbackProfile } = useQuery({
    queryKey: ["booking-target-profile", mentorId],
    queryFn: async () => {
      if (!mentorId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, headline")
        .eq("id", mentorId)
        .maybeSingle();
      return data;
    },
    enabled: !!mentorId && !mentorLoading && !mentorProfile,
  });
  const { data: availabilitySlots = [] } = useMentorAvailability(mentorId || undefined);
  const createBooking = useCreateBooking();
  const { startConversation } = useStartConversation();
  const { hasRole, isLoading: rolesLoading } = useUserRoles();
  const currentUserIsMentor = hasRole("mentor");

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [message, setMessage] = useState("");
  const [goals, setGoals] = useState("");
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const { data: wallet } = useWallet();
  const { data: creditPackages = [] } = useCreditPackages();
  const sessionPrice = useActionPrice("mentor_session");
  const baseCredits = sessionPrice?.price_credits ?? 5000;
  const hourlyRate = Number(mentorProfile?.hourly_rate || 0);
  // Mentor's hourly rate (in MMK if set), otherwise fall back to base price.
  const sessionCredits = (hourlyRate > 0 ? Math.round((hourlyRate * selectedDuration) / 60) : baseCredits);
  const sessionAmount = sessionCredits;
  const currency = "MMK";
  const balance = wallet?.balance_credits ?? 0;
  const insufficient = balance < sessionCredits;

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
    if (!user || !mentorId || !selectedDate || !selectedTopic) return;

    // Double-check slot availability before confirming
    if (selectedTime) {
      const { data: conflicting } = await supabase
        .from("mentor_bookings")
        .select("id")
        .eq("mentor_id", mentorId)
        .eq("scheduled_date", selectedDateStr)
        .eq("scheduled_time", selectedTime)
        .not("status", "in", '("cancelled","declined")');
      if (conflicting && conflicting.length > 0) {
        toast({
          title: lang === "my" ? "အချိန် မရနိုင်ပါ" : "Slot unavailable",
          description: lang === "my"
            ? "ဤ အချိန်ကို ယခင်တည်း ချိန်းဆိုပြီးသားဖြစ်သည်။ အခြားအချိန်ရွေးပါ။"
            : "This slot was just booked. Please select another time.",
          variant: "destructive",
        });
        return;
      }
    }

    if (insufficient) {
      toast({ title: lang === "my" ? "Credit မလုံလောက်ပါ" : "Insufficient credits", variant: "destructive" });
      setTopupOpen(true);
      return;
    }
    try {
      const result = await createBooking.mutateAsync({
        mentor_id: mentorId,
        mentee_id: user.id,
        scheduled_date: selectedDateStr,
        scheduled_time: selectedTime || "TBD",
        topic: selectedTopic,
        message,
        goals,
        booked_by: "mentee",
        duration_minutes: selectedDuration,
        credits_charged: sessionCredits,
      });
      // Hold credits in escrow
      const { error: holdErr } = await (supabase as any).rpc("mentor_book_with_credits", {
        _booking_id: result.id,
        _credits: sessionCredits,
      });
      if (holdErr) throw holdErr;
      setCreatedBookingId(result.id);
      setStep(4);
    } catch (e: any) {
      toast({
        title: lang === "my" ? "အမှား" : "Error",
        description: e?.message || (lang === "my" ? "ချိန်းဆိုမှု မအောင်မြင်ပါ" : "Failed to create booking"),
        variant: "destructive",
      });
    }
  };

  const mentorName = mentorProfile?.profile?.display_name || fallbackProfile?.display_name || "User";
  const mentorTitle = mentorProfile ? `${mentorProfile.title || ""} · ${mentorProfile.company || ""}`.replace(/^ · | · $/g, "") : "";
  const mentorTz = (mentorProfile as any)?.timezone || "Asia/Yangon";
  const durationLabel = durationOptions.find(d => d.minutes === selectedDuration);

  // Guard: non-mentors can only book with users who ARE mentors.
  // Mentors themselves may book with anyone.
  if (!mentorId) {
    return (
      <div className="min-h-screen bg-background pb-10">
        <PageHeader title={lang === "my" ? "ချိန်းဆိုရန်" : "Book Session"} backPath="/mentors" />
        <div className="px-5 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {lang === "my" ? "Mentor မရွေးချယ်ရသေးပါ" : "No mentor selected"}
          </p>
        </div>
      </div>
    );
  }

  if (mentorLoading || rolesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!mentorProfile && !currentUserIsMentor) {
    return (
      <div className="min-h-screen bg-background pb-10">
        <PageHeader title={lang === "my" ? "ချိန်းဆိုရန်" : "Book Session"} backPath="/mentors" />
        <div className="mx-auto mt-10 max-w-md px-5 text-center">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-2 text-base font-semibold text-foreground">
              {lang === "my" ? "ချိန်းဆို၍ မရပါ" : "Booking Not Available"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lang === "my"
                ? "ဤအသုံးပြုသူသည် Mentor မဟုတ်သေးပါ။ Mentor တစ်ဦးနှင့်သာ ချိန်းဆို၍ ရပါသည်။"
                : "This user isn't a mentor. You can only book sessions with mentors."}
            </p>
            <Button variant="outline" className="mt-5 rounded-xl" onClick={() => navigate("/mentors")}>
              {lang === "my" ? "Mentor များကို ကြည့်ရန်" : "Browse Mentors"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="bg-background pb-10">
        <PageHeader title={lang === "my" ? "အတည်ပြုချက်" : "Confirmation"} onBack={() => navigate("/mentors")} />
        <div className="flex flex-col items-center px-5 pt-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full max-w-sm flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
              <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
            </div>
            <h1 className="mb-2 text-xl font-bold text-foreground">
              {lang === "my" ? "ချိန်းဆိုပြီးပါပြီ!" : "Booking Confirmed!"}
            </h1>
            <p className="mb-1 text-sm text-muted-foreground">{lang === "my" ? `${mentorName} နှင့် ချိန်းဆိုမှု` : `Session with ${mentorName}`}</p>
            <p className="mb-1 text-sm font-semibold text-foreground">{selectedDateDisplay} · {selectedTime}</p>
            <p className="mb-1 text-xs text-muted-foreground">{lang === "my" ? `အကြောင်းအရာ: ${selectedTopic}` : `Topic: ${selectedTopic}`}</p>
            <p className="mb-3 text-xs text-muted-foreground">
              {lang === "my" ? `ကြာချိန်: ${durationLabel?.labelMy}` : `Duration: ${durationLabel?.labelEn}`}
              {` · ${sessionCredits.toLocaleString()} credits`}
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
                <p className="text-xs font-semibold text-foreground">{lang === "my" ? "Escrow အကာအကွယ်" : "Escrow Protection"}</p>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {lang === "my"
                  ? "သင့် Credits ကို Session ပြီးဆုံးပြီးမှသာ Mentor ထံ လွှဲပြောင်းပေးပါမည် (85% Mentor / 15% Platform)။"
                  : "Your credits are held in escrow and only released to the mentor (85%) after the session is completed."}
              </p>
            </div>

            <Button variant="outline" size="lg" className="mb-3 w-full rounded-xl" onClick={() => mentorId && startConversation(mentorId)}>
              <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "Mentor ကို မက်ဆေ့ချ် ပို့ရန်" : "Message Mentor"}
            </Button>
            <Button variant="default" size="lg" className="w-full rounded-xl" onClick={() => navigate("/mentors/bookings")}>
              {lang === "my" ? "Bookings သို့" : "Go to My Bookings"}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Build a 30-day rolling date strip starting today.
  // If the mentor has set availability, only those dates are enabled; otherwise all future dates are enabled.
  const dateStrip = useMemo(() => {
    const days: { date: Date; key: string; hasSlots: boolean }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      days.push({ date: d, key, hasSlots: availableDates.has(key) });
    }
    return days;
  }, [today, availableDates]);

  const stepLabels = [
    lang === "my" ? "အချိန်" : "When",
    lang === "my" ? "အသေးစိတ်" : "Details",
    lang === "my" ? "အတည်ပြု" : "Confirm",
  ];

  return (
    <div className="bg-background pb-24">
      <PageHeader title={lang === "my" ? "ချိန်းဆိုရန်" : "Book Session"} backPath={`/mentors/${mentorId}`} />

      <div className="px-5">
        {/* Stepper */}
        <div className="mb-5 flex items-center gap-2">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const active = step >= n;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {n}
                </div>
                <span className={`text-[11px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                {i < stepLabels.length - 1 && (
                  <div className={`ml-1 h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mentor header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {mentorName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">{mentorName}</h3>
            {mentorTitle && <p className="truncate text-[11px] text-muted-foreground">{mentorTitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {(mentorProfile?.rating_avg || 0) > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                <span className="text-[11px] font-semibold text-foreground">{mentorProfile?.rating_avg}</span>
              </div>
            )}
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {sessionCredits.toLocaleString()} cr
            </span>
          </div>
        </motion.div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Date strip */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <CalendarIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  {lang === "my" ? "ရက် ရွေးချယ်ပါ" : "Select Date"}
                </h2>
                <span className="text-[10px] text-muted-foreground">{mentorTz}</span>
              </div>
              {availableDates.size === 0 && (
                <div className="mb-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {lang === "my"
                      ? "ဤ Mentor သည် အချိန်ဇယား မသတ်မှတ်ရသေးပါ။ ရက် ရွေးချယ်ပြီး တောင်းဆိုချက် ပို့နိုင်ပါသည်"
                      : "This mentor hasn't set availability yet — pick a preferred date and send a request."}
                  </p>
                </div>
              )}
              <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-2">
                  {dateStrip.map(({ date, key, hasSlots }) => {
                    const enabled = availableDates.size === 0 || hasSlots;
                    const selected = selectedDateStr === key;
                    return (
                      <button
                        key={key}
                        disabled={!enabled}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        className={`relative flex min-w-[58px] flex-col items-center rounded-xl border px-2 py-2.5 transition-all ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : enabled
                              ? "border-border bg-card text-foreground hover:border-primary/40"
                              : "border-border/50 bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                        }`}
                      >
                        <span className={`text-[10px] font-medium uppercase tracking-wide ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {format(date, "EEE")}
                        </span>
                        <span className="mt-0.5 text-lg font-bold leading-none">{format(date, "d")}</span>
                        <span className={`mt-0.5 text-[10px] ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {format(date, "MMM")}
                        </span>
                        {hasSlots && !selected && (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="mb-5">
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  {lang === "my" ? "အချိန်" : "Available Times"}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{selectedDateDisplay}</span>
                </h2>
                {timeSlotsForDate.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {timeSlotsForDate.map(slot => (
                      <button
                        key={slot.raw}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`rounded-xl border py-2.5 text-center text-sm font-medium transition-all ${
                          selectedTime === slot.time
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-card/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      {lang === "my" ? "ဤနေ့တွင် အချိန်မရှိပါ" : "No available times this day"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Duration */}
            <div className="mb-2">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Timer className="h-4 w-4 text-primary" strokeWidth={1.5} />
                {lang === "my" ? "ကြာချိန်" : "Duration"}
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {durationOptions.map(opt => {
                  const optCredits = hourlyRate > 0
                    ? Math.round((hourlyRate * opt.minutes) / 60)
                    : Math.round((baseCredits * opt.minutes) / 60);
                  const sel = selectedDuration === opt.minutes;
                  return (
                    <button
                      key={opt.minutes}
                      onClick={() => setSelectedDuration(opt.minutes)}
                      className={`rounded-xl border p-2.5 text-center transition-all ${sel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/40"}`}
                    >
                      <p className="text-xs font-semibold">{lang === "my" ? opt.labelMy : opt.labelEn}</p>
                      <p className={`mt-0.5 text-[10px] ${sel ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{optCredits.toLocaleString()} cr</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inline session fee summary */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
              <span className="text-xs text-muted-foreground">
                {lang === "my" ? "Session ကြေး" : "Session fee"}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                <Coins className="h-3.5 w-3.5" strokeWidth={2} />
                {sessionCredits.toLocaleString()}
                <span className="text-[10px] font-medium text-muted-foreground">credits</span>
              </span>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Summary card */}
            <div className="mb-5 rounded-xl border border-border bg-muted p-4">
              <p className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "ချိန်းဆိုမှု အကျဉ်းချုပ်" : "Booking Summary"}</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">{lang === "my" ? "Mentor:" : "Mentor:"}</span> {mentorName}</p>
                <p><span className="font-medium text-foreground">{lang === "my" ? "ရက်:" : "Date:"}</span> {selectedDateDisplay}</p>
                {selectedTime && <p><span className="font-medium text-foreground">{lang === "my" ? "အချိန်:" : "Time:"}</span> {selectedTime}</p>}
                <p><span className="font-medium text-foreground">{lang === "my" ? "ကြာချိန်:" : "Duration:"}</span> {durationLabel ? (lang === "my" ? durationLabel.labelMy : durationLabel.labelEn) : ""}</p>
                <p><span className="font-medium text-foreground">{lang === "my" ? "ကုန်ကျမည်:" : "Cost:"}</span> {sessionCredits.toLocaleString()} credits</p>
                <p className="text-[10px] text-muted-foreground/70">
                  {lang === "my"
                    ? `Times in ${(mentorProfile as any)?.timezone || "mentor's timezone"}`
                    : `Times in ${(mentorProfile as any)?.timezone || "mentor's timezone"}`}
                </p>
              </div>
              <p className="mt-3 text-[10px] text-destructive/80">
                {lang === "my"
                  ? "Session မတိုင်မီ ၂၄ နာရီအတွင်း ပယ်ဖျက်သည့် ချိန်းဆိုမှုများအတွက် ငွေပြန်မအမ်းပါ။"
                  : "Cancellations less than 24 hours before the session are non-refundable."}
              </p>
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
            <Textarea
              value={goals}
              onChange={e => { if (e.target.value.length <= 500) setGoals(e.target.value); }}
              maxLength={500}
              placeholder={lang === "my" ? "ဤ Session မှ ဘာရယူချင်ပါသလဲ?" : "What do you want to achieve from this session?"}
              className="mb-1 min-h-[60px] rounded-xl border-border bg-card text-sm"
            />
            <p className="mb-4 text-right text-[10px] text-muted-foreground">{goals.length} / 500</p>

            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "မက်ဆေ့ချ် (ရွေးချယ်ပိုင်ခွင့်)" : "Message (Optional)"}</h2>
            <Textarea
              value={message}
              onChange={e => { if (e.target.value.length <= 500) setMessage(e.target.value); }}
              maxLength={500}
              placeholder={lang === "my" ? "Mentor ကို ကြိုတင် ပြောလိုသည့် အကြောင်းအရာ..." : "Anything you'd like to discuss in advance..."}
              className="mb-1 min-h-[60px] rounded-xl border-border bg-card text-sm"
            />
            <p className="text-right text-[10px] text-muted-foreground">{message.length} / 500</p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {lang === "my" ? "ပြန်စစ်ပြီး အတည်ပြုပါ" : "Review & Confirm"}
            </h2>

            {/* Booking details */}
            <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {lang === "my" ? "Session အသေးစိတ်" : "Session Details"}
                </p>
              </div>
              <div className="divide-y divide-border text-xs">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">{lang === "my" ? "Mentor" : "Mentor"}</span>
                  <span className="font-medium text-foreground">{mentorName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">{lang === "my" ? "ရက်စွဲ" : "Date"}</span>
                  <span className="font-medium text-foreground">{selectedDateDisplay}</span>
                </div>
                {selectedTime && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">{lang === "my" ? "အချိန်" : "Time"}</span>
                    <span className="font-medium text-foreground">{selectedTime} <span className="text-[10px] text-muted-foreground">({mentorTz})</span></span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">{lang === "my" ? "ကြာချိန်" : "Duration"}</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <Timer className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                    {durationLabel ? (lang === "my" ? durationLabel.labelMy : durationLabel.labelEn) : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">{lang === "my" ? "အကြောင်းအရာ" : "Topic"}</span>
                  <span className="font-medium text-foreground">{selectedTopic}</span>
                </div>
                <div className="flex items-center justify-between bg-primary/5 px-4 py-3">
                  <span className="font-semibold text-foreground">{lang === "my" ? "စုစုပေါင်း ကုန်ကျမည်" : "Total Charged"}</span>
                  <span className="inline-flex items-center gap-1 text-base font-bold text-primary">
                    <Coins className="h-4 w-4" strokeWidth={2} />
                    {sessionCredits.toLocaleString()} <span className="text-xs font-medium">credits</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Escrow Timeline */}
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <p className="text-xs font-semibold text-foreground">
                  {lang === "my" ? "Escrow လုပ်ငန်းစဉ်" : "Escrow Timeline"}
                </p>
              </div>
              <ol className="space-y-3">
                {[
                  {
                    en: `Now — ${sessionCredits.toLocaleString()} credits held in escrow from your wallet`,
                    my: `ယခု — ${sessionCredits.toLocaleString()} credits ကို သင့် Wallet မှ Escrow တွင် ထိန်းသိမ်းပါမည်`,
                  },
                  {
                    en: "Mentor confirms or proposes a new time",
                    my: "Mentor က အတည်ပြုသည် (သို့) အချိန်အသစ် အဆိုပြုသည်",
                  },
                  {
                    en: "Session takes place at the scheduled time",
                    my: "ချိန်းဆိုထားသော အချိန်တွင် Session ပြုလုပ်သည်",
                  },
                  {
                    en: `After both confirm completion → 85% (${Math.round(sessionCredits * 0.85).toLocaleString()} credits) released to mentor, 15% platform fee`,
                    my: `နှစ်ဦးစလုံး အပြီးအပိုင် အတည်ပြုပြီးနောက် → ၈၅% (${Math.round(sessionCredits * 0.85).toLocaleString()} credits) Mentor ထံ၊ ၁၅% Platform အခကြေး`,
                  },
                  {
                    en: "If mentor declines or cancels → full refund to your wallet",
                    my: "Mentor ငြင်းပယ်/ပယ်ဖျက်ပါက → သင့် Wallet သို့ ပြည့်ပြည့်ဝဝ ပြန်အမ်းပါမည်",
                  },
                ].map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {lang === "my" ? s.my : s.en}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Cancellation policy */}
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-[11px] leading-relaxed text-destructive/90">
                {lang === "my"
                  ? "Session မတိုင်မီ ၂၄ နာရီအတွင်း ပယ်ဖျက်လျှင် ငွေပြန်အမ်းမည် မဟုတ်ပါ။"
                  : "Cancellations less than 24 hours before the session are non-refundable."}
              </p>
            </div>

            {/* Wallet snapshot */}
            <div className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-[11px]">
              <span className="text-muted-foreground">{lang === "my" ? "Wallet လက်ကျန်" : "Wallet balance"}</span>
              <span className="font-semibold text-foreground">{balance.toLocaleString()} credits</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-[11px]">
              <span className="text-muted-foreground">{lang === "my" ? "Booking ပြီးနောက်" : "After this booking"}</span>
              <span className={`font-semibold ${insufficient ? "text-destructive" : "text-foreground"}`}>
                {(balance - sessionCredits).toLocaleString()} credits
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="px-5">
        <div className="mt-2 flex w-full gap-2">
          {step === 1 && (
            <Button variant="default" size="lg" className="w-full rounded-xl" disabled={!selectedDate || (timeSlotsForDate.length > 0 && !selectedTime)} onClick={() => setStep(2)}>
              {lang === "my" ? "ဆက်လက်ရန်" : "Continue"}
            </Button>
          )}
          {step === 2 && (
            <Button variant="default" size="lg" className="w-full rounded-xl" disabled={!selectedTopic} onClick={() => setStep(3)}>
              {lang === "my" ? "ပြန်စစ်ရန်" : "Review Booking"}
            </Button>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" size="lg" className="rounded-xl" onClick={() => setStep(2)}>
                {lang === "my" ? "ပြန်ပြင်ရန်" : "Edit"}
              </Button>
              {insufficient ? (
                <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => setTopupOpen(true)}>
                  <Coins className="mr-1.5 h-4 w-4" />
                  {lang === "my"
                    ? `Credit ${(sessionCredits - balance).toLocaleString()} ဖြည့်ရန်`
                    : `Top up ${(sessionCredits - balance).toLocaleString()} more`}
                </Button>
              ) : (
                <Button variant="default" size="lg" className="flex-1 rounded-xl" disabled={createBooking.isPending} onClick={handleConfirm}>
                  <Coins className="mr-1.5 h-4 w-4" />
                  {createBooking.isPending
                    ? (lang === "my" ? "ချိန်းဆိုနေသည်..." : "Booking...")
                    : (lang === "my" ? `${sessionCredits.toLocaleString()} credits ပေး၍ အတည်ပြုမည်` : `Confirm & Pay ${sessionCredits.toLocaleString()} credits`)}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <TopupSheet open={topupOpen} onOpenChange={setTopupOpen} packages={creditPackages} />
    </div>
  );
};

export default MentorBooking;
