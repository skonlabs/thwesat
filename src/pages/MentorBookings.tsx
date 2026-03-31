import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Clock, CheckCircle, XCircle, MessageCircle,
  Plus, User, ChevronDown, Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";

const timeSlots = [
  { time: "9:00 AM", available: true },
  { time: "10:00 AM", available: true },
  { time: "11:00 AM", available: false },
  { time: "2:00 PM", available: true },
  { time: "3:00 PM", available: true },
  { time: "4:00 PM", available: true },
  { time: "7:00 PM", available: true },
  { time: "8:00 PM", available: false },
];

const topics = [
  { my: "အသက်မွေးမှု လမ်းညွှန်", en: "Career Coaching" },
  { my: "CV စစ်ဆေး", en: "Resume Review" },
  { my: "အင်တာဗျူး ပြင်ဆင်", en: "Interview Prep" },
  { my: "နည်းပညာ လမ်းညွှန်", en: "Technical Guidance" },
  { my: "အခြား", en: "Other" },
];

const upcomingDays = [
  { date: "Apr 1", day: { my: "အင်္ဂါ", en: "Tue" } },
  { date: "Apr 2", day: { my: "ဗုဒ္ဓဟူး", en: "Wed" } },
  { date: "Apr 3", day: { my: "ကြာသပတေး", en: "Thu" } },
  { date: "Apr 5", day: { my: "စနေ", en: "Sat" } },
  { date: "Apr 6", day: { my: "တနင်္ဂနွေ", en: "Sun" } },
];

const mockMentees = [
  { id: 1, name: "Thiri Win", nameMy: "သီရိဝင်း", avatar: "TW", role: "Frontend Developer" },
  { id: 2, name: "Aung Kyaw", nameMy: "အောင်ကျော်", avatar: "AK", role: "Fresh Graduate" },
  { id: 3, name: "Zaw Min", nameMy: "ဇော်မင်း", avatar: "ZM", role: "Data Analyst" },
  { id: 4, name: "May Lwin", nameMy: "မေလွင်", avatar: "ML", role: "UI/UX Designer" },
];

const mockBookings = [
  { id: 1, mentee: "Thiri Win", menteeMy: "သီရိဝင်း", avatar: "TW", topic: "Interview Prep", topicMy: "အင်တာဗျူး ပြင်ဆင်", date: "Apr 5", time: "2:00 PM", status: "confirmed" as const, bookedBy: "mentee" as const },
  { id: 2, mentee: "Aung Kyaw", menteeMy: "အောင်ကျော်", avatar: "AK", topic: "CV Review", topicMy: "CV ပြန်ကြည့်", date: "Apr 3", time: "10:00 AM", status: "pending" as const, bookedBy: "mentee" as const },
  { id: 3, mentee: "Zaw Min", menteeMy: "ဇော်မင်း", avatar: "ZM", topic: "Technical Guidance", topicMy: "နည်းပညာ လမ်းညွှန်", date: "Apr 2", time: "3:00 PM", status: "pending" as const, bookedBy: "mentor" as const },
  { id: 4, mentee: "Thiri Win", menteeMy: "သီရိဝင်း", avatar: "TW", topic: "Career Coaching", topicMy: "အသက်မွေးမှု လမ်းညွှန်", date: "Mar 28", time: "7:00 PM", status: "completed" as const, bookedBy: "mentee" as const },
  { id: 5, mentee: "Hnin Si", menteeMy: "နှင်းဆီ", avatar: "HS", topic: "Career Coaching", topicMy: "အသက်မွေးမှု လမ်းညွှန်", date: "Mar 25", time: "11:00 AM", status: "completed" as const, bookedBy: "mentor" as const },
  { id: 6, mentee: "May Lwin", menteeMy: "မေလွင်", avatar: "ML", topic: "Career Coaching", topicMy: "အသက်မွေးမှု လမ်းညွှန်", date: "Apr 6", time: "4:00 PM", status: "pending" as const, bookedBy: "mentee" as const },
];

const statusConfig = {
  pending: { label: { my: "စောင့်ဆိုင်း", en: "Pending" }, color: "text-primary bg-primary/10", icon: Clock },
  confirmed: { label: { my: "အတည်ပြုပြီး", en: "Confirmed" }, color: "text-emerald bg-emerald/10", icon: CheckCircle },
  completed: { label: { my: "ပြီးဆုံး", en: "Completed" }, color: "text-muted-foreground bg-muted", icon: CheckCircle },
  cancelled: { label: { my: "ပယ်ဖျက်", en: "Cancelled" }, color: "text-destructive bg-destructive/10", icon: XCircle },
};

type FilterType = "all" | "pending" | "confirmed" | "completed";

const MentorBookings = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const [bookings, setBookings] = useState(mockBookings);
  const [showNewBooking, setShowNewBooking] = useState(false);

  // New booking form state
  const [selectedMentee, setSelectedMentee] = useState<typeof mockMentees[0] | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingStep, setBookingStep] = useState(1); // 1=select mentee, 2=date/time, 3=topic/confirm

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const handleConfirm = (id: number) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "confirmed" as const } : b));
    toast({ title: lang === "my" ? "Booking အတည်ပြုပြီး ✓" : "Booking confirmed ✓" });
  };

  const handleDecline = (id: number) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" as const } : b));
    toast({ title: lang === "my" ? "Booking ပယ်ဖျက်ပြီး" : "Booking declined" });
  };

  const handleCreateBooking = () => {
    if (!selectedMentee || !selectedDay || !selectedTime || !selectedTopic) return;
    const newBooking = {
      id: bookings.length + 1,
      mentee: selectedMentee.name,
      menteeMy: selectedMentee.nameMy,
      avatar: selectedMentee.avatar,
      topic: selectedTopic,
      topicMy: topics.find(t => t.en === selectedTopic)?.my || selectedTopic,
      date: selectedDay,
      time: selectedTime,
      status: "confirmed" as const,
      bookedBy: "mentor" as const,
    };
    setBookings(prev => [newBooking, ...prev]);
    setShowNewBooking(false);
    resetBookingForm();
    toast({ title: lang === "my" ? "Booking ဖန်တီးပြီး ✓" : "Booking created ✓" });
  };

  const resetBookingForm = () => {
    setSelectedMentee(null);
    setSelectedDay(null);
    setSelectedTime(null);
    setSelectedTopic(null);
    setBookingMessage("");
    setBookingStep(1);
  };

  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const confirmedCount = bookings.filter(b => b.status === "confirmed").length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "Booking များ" : "Bookings"} />

      <div className="px-5">
        {/* Summary Row */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { value: pendingCount, label: lang === "my" ? "စောင့်ဆိုင်း" : "Pending", color: "text-primary" },
            { value: confirmedCount, label: lang === "my" ? "အတည်ပြု" : "Confirmed", color: "text-emerald" },
            { value: bookings.filter(b => b.status === "completed").length, label: lang === "my" ? "ပြီးဆုံး" : "Done", color: "text-muted-foreground" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* New Booking Button */}
        <Button
          variant="gold" size="sm"
          className="mb-4 w-full rounded-xl text-xs"
          onClick={() => { setShowNewBooking(true); resetBookingForm(); }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "Mentee နှင့် ချိန်းဆိုရန်" : "Book Session with Mentee"}
        </Button>

        {/* Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {(["all", "pending", "confirmed", "completed"] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
              }`}>
              {f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f].label.my : statusConfig[f].label.en)}
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[9px] font-bold text-primary">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        <div className="space-y-3">
          {filtered.map((booking, i) => {
            const sc = statusConfig[booking.status];
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{booking.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">{lang === "my" ? booking.menteeMy : booking.mentee}</h3>
                        <p className="truncate text-[11px] text-muted-foreground">{lang === "my" ? booking.topicMy : booking.topic}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                          <sc.icon className="h-3 w-3" strokeWidth={1.5} />
                          {lang === "my" ? sc.label.my : sc.label.en}
                        </span>
                        {booking.bookedBy === "mentor" && (
                          <span className="text-[9px] text-muted-foreground">{lang === "my" ? "သင်ချိန်းဆိုသည်" : "You booked"}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" strokeWidth={1.5} /> {booking.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> {booking.time}</span>
                    </div>

                    {booking.status === "pending" && booking.bookedBy === "mentee" && (
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => handleDecline(booking.id)}>
                          {lang === "my" ? "ငြင်းပယ်" : "Decline"}
                        </Button>
                        <Button variant="gold" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => handleConfirm(booking.id)}>
                          {lang === "my" ? "အတည်ပြု" : "Confirm"}
                        </Button>
                      </div>
                    )}

                    {booking.status === "confirmed" && (
                      <div className="mt-3">
                        <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => navigate("/messages/chat")}>
                          <MessageCircle className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <Calendar className="mb-3 h-10 w-10 text-muted-foreground" strokeWidth={1} />
              <p className="text-sm font-medium text-foreground">{lang === "my" ? "Booking မရှိပါ" : "No bookings"}</p>
            </div>
          )}
        </div>
      </div>

      {/* New Booking Sheet (Mentor books a mentee) */}
      <Sheet open={showNewBooking} onOpenChange={open => { if (!open) { setShowNewBooking(false); resetBookingForm(); } }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-24">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base">{lang === "my" ? "Mentee နှင့် ချိန်းဆိုရန်" : "Book Session with Mentee"}</SheetTitle>
            <SheetDescription className="text-xs">{lang === "my" ? "Mentee ရွေးချယ်ပြီး session ချိန်းဆိုပါ" : "Select a mentee and schedule a session"}</SheetDescription>
          </SheetHeader>

          {/* Progress */}
          <div className="mb-5 flex gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${bookingStep >= s ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {bookingStep === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                <User className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
                {lang === "my" ? "Mentee ရွေးချယ်ပါ" : "Select Mentee"}
              </h3>
              <div className="space-y-2">
                {mockMentees.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMentee(m); setBookingStep(2); }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors active:bg-muted ${
                      selectedMentee?.id === m.id ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{m.avatar}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{lang === "my" ? m.nameMy : m.name}</p>
                      <p className="text-[11px] text-muted-foreground">{m.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {bookingStep === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {/* Selected mentee chip */}
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{selectedMentee?.avatar}</div>
                <span className="text-xs font-medium text-foreground">{lang === "my" ? selectedMentee?.nameMy : selectedMentee?.name}</span>
              </div>

              <h3 className="mb-3 text-sm font-semibold text-foreground">
                <Calendar className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
                {lang === "my" ? "ရက် ရွေးချယ်ပါ" : "Select Day"}
              </h3>
              <div className="mb-5 grid grid-cols-5 gap-2">
                {upcomingDays.map(d => (
                  <button key={d.date} onClick={() => setSelectedDay(d.date)}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      selectedDay === d.date ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground active:bg-muted"
                    }`}>
                    <p className="text-[9px] opacity-70">{lang === "my" ? d.day.my : d.day.en}</p>
                    <p className="text-xs font-semibold">{d.date.split(" ")[1]}</p>
                  </button>
                ))}
              </div>

              <h3 className="mb-3 text-sm font-semibold text-foreground">
                <Clock className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
                {lang === "my" ? "အချိန် ရွေးချယ်ပါ" : "Select Time"}
              </h3>
              <div className="mb-4 grid grid-cols-4 gap-2">
                {timeSlots.map(slot => (
                  <button key={slot.time} disabled={!slot.available} onClick={() => setSelectedTime(slot.time)}
                    className={`rounded-xl border p-2.5 text-center text-xs font-medium transition-all ${
                      !slot.available ? "border-border bg-muted text-muted-foreground/40 cursor-not-allowed"
                        : selectedTime === slot.time ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground active:bg-muted"
                    }`}>
                    {slot.time}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => setBookingStep(1)}>
                  {lang === "my" ? "နောက်သို့" : "Back"}
                </Button>
                <Button variant="gold" size="sm" className="flex-1 rounded-lg text-xs" disabled={!selectedDay || !selectedTime} onClick={() => setBookingStep(3)}>
                  {lang === "my" ? "ဆက်လက်ရန်" : "Continue"}
                </Button>
              </div>
            </motion.div>
          )}

          {bookingStep === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {/* Summary chip */}
              <div className="mb-4 rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">{lang === "my" ? selectedMentee?.nameMy : selectedMentee?.name}</p>
                <p className="text-sm font-semibold text-foreground">{selectedDay} · {selectedTime}</p>
              </div>

              <h3 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "အကြောင်းအရာ ရွေးချယ်ပါ" : "Select Topic"}</h3>
              <div className="mb-4 flex flex-wrap gap-2">
                {topics.map(t => (
                  <button key={t.en} onClick={() => setSelectedTopic(t.en)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedTopic === t.en ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                    }`}>
                    {lang === "my" ? t.my : t.en}
                  </button>
                ))}
              </div>

              <h3 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "မက်ဆေ့ချ် (ရွေးချယ်)" : "Message (Optional)"}</h3>
              <Textarea value={bookingMessage} onChange={e => setBookingMessage(e.target.value)}
                placeholder={lang === "my" ? "Mentee ကို ကြိုတင်ပြောလိုသည့်အရာ..." : "Anything to share with the mentee..."}
                className="mb-4 min-h-[60px] rounded-xl border-border bg-card text-sm" />

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => setBookingStep(2)}>
                  {lang === "my" ? "နောက်သို့" : "Back"}
                </Button>
                <Button variant="gold" size="sm" className="flex-1 rounded-lg text-xs" disabled={!selectedTopic} onClick={handleCreateBooking}>
                  {lang === "my" ? "ချိန်းဆိုမှု ဖန်တီးရန်" : "Create Booking"}
                </Button>
              </div>
            </motion.div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MentorBookings;
