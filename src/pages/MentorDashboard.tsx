import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, DollarSign, Star, Users, CheckCircle, XCircle, MessageCircle, Shield, Sparkles, Eye } from "lucide-react";
import AvailabilityManager from "@/components/mentor/AvailabilityManager";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { useMentorProfile } from "@/hooks/use-mentor-data";
import { useMentorBookings, useMentorEarnings, useUpdateBookingStatus } from "@/hooks/use-mentor-bookings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const availabilityDays = [
  { day: "Mon", dayMy: "တနင်္လာ" }, { day: "Tue", dayMy: "အင်္ဂါ" }, { day: "Wed", dayMy: "ဗုဒ္ဓဟူး" },
  { day: "Thu", dayMy: "ကြာသပတေး" }, { day: "Fri", dayMy: "သောကြာ" }, { day: "Sat", dayMy: "စနေ" }, { day: "Sun", dayMy: "တနင်္ဂနွေ" },
];

const quickActions = [
  { icon: Users, label: "တပည့်များ", labelEn: "Mentees", path: "/mentors/mentees", bg: "bg-primary/10", fg: "text-primary" },
  { icon: DollarSign, label: "ဝင်ငွေ", labelEn: "Earnings", path: "/mentor/finance", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: MessageCircle, label: "မက်ဆေ့ချ်", labelEn: "Messages", path: "/messages", bg: "bg-accent/15", fg: "text-gold-dark" },
  { icon: Eye, label: "ပရိုဖိုင်", labelEn: "Profile", path: "/profile", bg: "bg-primary/10", fg: "text-primary" },
];

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = {
  pending: { label: { my: "စောင့်ဆိုင်း", en: "Pending" }, color: "text-primary bg-primary/10", icon: Clock },
  confirmed: { label: { my: "အတည်ပြုပြီး", en: "Confirmed" }, color: "text-emerald bg-emerald/10", icon: CheckCircle },
  completed: { label: { my: "ပြီးဆုံး", en: "Completed" }, color: "text-muted-foreground bg-muted", icon: CheckCircle },
  cancelled: { label: { my: "ပယ်ဖျက်", en: "Cancelled" }, color: "text-destructive bg-destructive/10", icon: XCircle },
};

const MentorDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data: mentorProfile } = useMentorProfile(user?.id);
  const { data: bookings = [] } = useMentorBookings();
  const { data: earnings } = useMentorEarnings();
  const updateStatus = useUpdateBookingStatus();
  const { startConversation } = useStartConversation();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingFilter = searchParams.get("bookingFilter") || "all";
  const setBookingFilter = (next: string) => {
    const p = new URLSearchParams(searchParams);
    if (next === "all") p.delete("bookingFilter"); else p.set("bookingFilter", next);
    setSearchParams(p, { replace: true });
  };
  const [hourlyRate, setHourlyRate] = useState("30");
  const [currency, setCurrency] = useState("USD");
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeDays, setActiveDays] = useState<string[]>([]);

  // Decline with counter-proposal state
  const [declineBookingId, setDeclineBookingId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [proposedTime, setProposedTime] = useState("");

  useEffect(() => {
    if (mentorProfile) {
      setHourlyRate(mentorProfile.hourly_rate?.toString() || "30");
      setCurrency(mentorProfile.currency || "USD");
      setIsAvailable(mentorProfile.is_available ?? true);
      setActiveDays(mentorProfile.available_days || []);
    }
  }, [mentorProfile]);

  // Fetch mentee profiles for bookings
  const menteeIds = [...new Set(bookings.map((b: any) => b.mentee_id))];
  const { data: menteeProfiles = [] } = useQuery({
    queryKey: ["mentee-profiles", menteeIds],
    queryFn: async () => {
      if (!menteeIds.length) return [];
      const { data } = await supabase.from("profiles").select("id, display_name, headline, avatar_url").in("id", menteeIds);
      return data || [];
    },
    enabled: menteeIds.length > 0,
  });
  const menteeMap = new Map(menteeProfiles.map((p: any) => [p.id, p]));

  const filteredBookings = bookingFilter === "all" ? bookings : bookings.filter((b: any) => b.status === bookingFilter);

  const handleConfirm = (id: string) => {
    updateStatus.mutate({ id, status: "confirmed" }, {
      onSuccess: () => {},
    });
  };

  const handleDecline = (id: string) => {
    setDeclineBookingId(id);
    setDeclineReason("");
    setProposedDate("");
    setProposedTime("");
  };

  const handleSubmitDecline = () => {
    if (!declineBookingId) return;
    updateStatus.mutate({
      id: declineBookingId,
      status: "cancelled",
      declineReason: declineReason || undefined,
      proposedDate: proposedDate || undefined,
      proposedTime: proposedTime || undefined,
    }, {
      onSuccess: () => setDeclineBookingId(null),
    });
  };

  const handleSaveRate = async () => {
    if (!user) return;
    const rate = Math.max(0, Number(hourlyRate) || 0);
    setHourlyRate(rate.toString());
    const { error } = await supabase.from("mentor_profiles").update({ hourly_rate: rate, currency, is_available: isAvailable, available_days: activeDays }).eq("id", user.id);
    if (error) {
      toast.error(lang === "my" ? "သိမ်းဆည်း၍ မရပါ" : "Failed to save settings");
    }
  };

  const toggleDay = (day: string) => setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const totalEarnings = earnings?.allTime || 0;
  const thisMonthEarnings = earnings?.thisMonth || 0;

  const stats = [
    { icon: Calendar, label: { my: "စုစုပေါင်း Booking", en: "Total Bookings" }, value: bookings.length.toString(), color: "text-primary bg-primary/10", path: "/mentors/bookings" },
    { icon: Star, label: { my: "အမှတ်", en: "Rating" }, value: mentorProfile?.rating_avg?.toString() || "0", color: "text-emerald bg-emerald/10", path: "/mentors/dashboard" },
    { icon: DollarSign, label: { my: "ဤလ ဝင်ငွေ", en: "This Month" }, value: `$${thisMonthEarnings}`, color: "text-gold-dark bg-accent/15", path: "/mentors/dashboard" },
    { icon: Users, label: { my: "Mentee", en: "Mentees" }, value: (mentorProfile?.total_mentees || 0).toString(), color: "text-primary bg-primary/10", path: "/mentors/mentees" },
  ];

  const isProfileIncomplete = !mentorProfile?.title || !mentorProfile?.expertise?.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Mentor Dashboard" />
      <div className="px-5">
        {isProfileIncomplete && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              {lang === "my" ? "⚠️ သင့်ပရိုဖိုင် မပြည့်စုံသေးပါ" : "⚠️ Your mentor profile is incomplete"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "my"
                ? "အခြား အသုံးပြုသူများ သင့်ကို ရှာတွေ့နိုင်ရန် ခေါင်းစဉ်၊ ကျွမ်းကျင်မှုနှင့် တည်နေရာ ဖြည့်ပါ"
                : "Add your title, expertise, and location so job seekers can find and book you"}
            </p>
            <Button variant="outline" size="sm" className="mt-3 rounded-lg border-destructive/30 text-xs" onClick={() => navigate("/profile/edit")}>
              {lang === "my" ? "ပရိုဖိုင် ဖြည့်ရန်" : "Complete Profile"}
            </Button>
          </motion.div>
        )}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => navigate(stat.path)} className="rounded-xl border border-border bg-card p-3.5 text-left transition-colors active:bg-muted/30">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" strokeWidth={1.5} /></div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.button>
          ))}
        </div>

        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.path + action.labelEn} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors active:bg-muted">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.bg}`}><action.icon className={`h-4 w-4 ${action.fg}`} strokeWidth={1.5} /></div>
              <span className="text-[10px] font-medium text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </motion.button>
          ))}
        </div>

        {/* Availability & Rate */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{lang === "my" ? "နှုန်းထား & ရနိုင်မှု" : "Rate & Availability"}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{isAvailable ? (lang === "my" ? "ရနိုင်" : "Available") : (lang === "my" ? "မရနိုင်" : "Unavailable")}</span>
              <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">{lang === "my" ? "နာရီစျေးနှုန်း" : "Hourly Rate"}</label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="USD">USD ($)</option>
                <option value="MMK">MMK (ကျပ်)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="THB">THB (฿)</option>
                <option value="MYR">MYR (RM)</option>
              </select>
              <Input type="number" min="0" value={hourlyRate} onChange={e => {
                const val = e.target.value;
                if (val === "" || Number(val) >= 0) setHourlyRate(val);
              }} className="h-10 w-20 rounded-xl text-center" />
              <span className="text-xs text-muted-foreground">/ {lang === "my" ? "နာရီ" : "hr"}</span>
              <Button variant="outline" size="sm" className="ml-auto h-10 rounded-lg text-xs" onClick={handleSaveRate}>{lang === "my" ? "သိမ်းရန်" : "Save"}</Button>
            </div>
          </div>
        </motion.div>

        {/* Availability Calendar */}
        <div className="mb-5">
          <AvailabilityManager />
        </div>

        {/* Earnings */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-5 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "ဝင်ငွေ အကျဉ်းချုပ်" : "Earnings Summary"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-bold text-foreground">${thisMonthEarnings}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ဤလ" : "This Month"}</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-bold text-foreground">${totalEarnings}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "စုစုပေါင်း" : "All Time"}</p>
            </div>
          </div>
        </motion.div>

        {/* Bookings */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">{lang === "my" ? "Booking များ" : "Bookings"}</h2>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {["all", "pending", "confirmed", "completed"].map(f => (
            <button key={f} onClick={() => setBookingFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${bookingFilter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredBookings.map((booking: any, i: number) => {
            const sc = statusConfig[booking.status] || statusConfig.pending;
            const mentee = menteeMap.get(booking.mentee_id);
            return (
              <motion.div key={booking.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{mentee?.display_name?.slice(0, 2).toUpperCase() || "?"}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{mentee?.display_name || "Mentee"}</h3>
                        <p className="text-[11px] text-muted-foreground">{booking.topic || ""}</p>
                      </div>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                        <sc.icon className="h-3 w-3" strokeWidth={1.5} />{lang === "my" ? sc.label.my : sc.label.en}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" strokeWidth={1.5} /> {booking.scheduled_date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> {booking.scheduled_time}</span>
                    </div>
                    {booking.status === "pending" && (
                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => handleDecline(booking.id)}>{lang === "my" ? "ငြင်းပယ်" : "Decline"}</Button>
                        <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={() => handleConfirm(booking.id)}>{lang === "my" ? "အတည်ပြု" : "Confirm"}</Button>
                      </div>
                    )}
                    {booking.status === "confirmed" && (
                      <div className="mt-3 flex justify-end">
                        <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => startConversation(booking.mentee_id)}>
                          <MessageCircle className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filteredBookings.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <Calendar className="mb-3 h-10 w-10 text-muted-foreground" strokeWidth={1} />
              <p className="text-sm font-medium text-foreground">
                {bookings.length === 0
                  ? (lang === "my" ? "Booking မရှိသေးပါ" : "No bookings yet")
                  : (lang === "my" ? "ဤအခြေအနေအတွက် မရှိပါ" : "Nothing matches this filter")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {bookings.length === 0
                  ? (lang === "my" ? "ရနိုင်သော အချိန်များ သတ်မှတ်ထားပြီး mentee များကို စောင့်ပါ" : "Set your availability so mentees can book a session")
                  : (lang === "my" ? "အခြားအခြေအနေတစ်ခု ရွေးပါ" : "Try a different status")}
              </p>
              {bookings.length === 0 && (
                <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate("/profile/edit")}>
                  {lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit profile"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Decline / Counter-Proposal Modal */}
      <AnimatePresence>
        {declineBookingId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] bg-foreground/40" onClick={() => setDeclineBookingId(null)} />
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="fixed inset-x-0 bottom-16 z-[60] mx-auto max-w-md rounded-t-2xl bg-card p-5">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <h3 className="mb-1 text-sm font-semibold text-foreground">{lang === "my" ? "Booking ငြင်းပယ်ရန်" : "Decline Booking"}</h3>
              <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "အချိန်အသစ် အဆိုပြုနိုင်ပါသည် (မဖြစ်မနေမဟုတ်)" : "You can optionally propose an alternative time"}</p>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{lang === "my" ? "အကြောင်းပြချက်" : "Reason (optional)"}</label>
                  <Input value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder={lang === "my" ? "ဥပမာ - ထိုအချိန် အစည်းအဝေးရှိ" : "e.g. I have a meeting at that time"} className="rounded-xl" />
                </div>

                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">{lang === "my" ? "📅 အချိန်အသစ် အဆိုပြုရန်" : "📅 Propose a new time"}</p>
                  <div className="flex gap-2">
                    <Input type="date" value={proposedDate} onChange={e => setProposedDate(e.target.value)} className="flex-1 rounded-xl text-xs" min={new Date().toISOString().split("T")[0]} />
                    <Input type="time" value={proposedTime} onChange={e => setProposedTime(e.target.value)} className="w-28 rounded-xl text-xs" />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => setDeclineBookingId(null)}>
                    {lang === "my" ? "ပယ်ဖျက်" : "Cancel"}
                  </Button>
                  <Button variant="destructive" size="default" className="flex-1 rounded-xl" onClick={handleSubmitDecline} disabled={updateStatus.isPending}>
                    {proposedDate && proposedTime
                      ? (lang === "my" ? "ငြင်းပယ်ပြီး အချိန်သစ်ပေး" : "Decline & Propose")
                      : (lang === "my" ? "ငြင်းပယ်မည်" : "Decline")}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MentorDashboard;
