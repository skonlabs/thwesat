import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Star, Users, CheckCircle, XCircle, MessageCircle, Settings, WalletCards, AlertCircle, ChevronRight, CalendarClock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { useMentorProfile } from "@/hooks/use-mentor-data";
import { useMentorBookings, useMentorEarnings, useUpdateBookingStatus } from "@/hooks/use-mentor-bookings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import DashboardHero from "@/components/DashboardHero";
import { formatMoney } from "@/lib/finance";
import { computeProfileCompletion } from "@/lib/profile-completion";

function formatReceivedAgo(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = {
  pending: { label: { my: "စောင့်ဆိုင်း", en: "Pending" }, color: "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300", icon: Clock },
  confirmed: { label: { my: "အတည်ပြုပြီး", en: "Confirmed" }, color: "text-emerald bg-emerald/10", icon: CheckCircle },
  completed: { label: { my: "ပြီးဆုံး", en: "Completed" }, color: "text-muted-foreground bg-muted", icon: CheckCircle },
  cancelled: { label: { my: "ပယ်ဖျက်", en: "Cancelled" }, color: "text-destructive bg-destructive/10", icon: XCircle },
};

const MentorDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { data: mentorProfile } = useMentorProfile(user?.id);
  const { data: bookings = [] } = useMentorBookings();
  const { data: earnings } = useMentorEarnings();
  const updateStatus = useUpdateBookingStatus();
  const { startConversation } = useStartConversation();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingFilter = searchParams.get("bookingFilter") || "pending";
  const setBookingFilter = (next: string) => {
    const p = new URLSearchParams(searchParams);
    if (next === "pending") p.delete("bookingFilter"); else p.set("bookingFilter", next);
    setSearchParams(p, { replace: true });
  };

  const [showSetupAlert, setShowSetupAlert] = useState(false);
  const [declineBookingId, setDeclineBookingId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [proposedTime, setProposedTime] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mentor_setup") === "1") {
      setShowSetupAlert(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Mentee profile lookup
  const menteeIds = [...new Set(bookings.map((b: any) => b.mentee_id))];
  const { data: menteeProfiles = [] } = useQuery({
    queryKey: ["mentee-profiles", menteeIds],
    queryFn: async () => {
      if (!menteeIds.length) return [];
      const { data } = await (supabase as any).from("profiles").select("id, display_name, headline, avatar_url").in("id", menteeIds);
      return data || [];
    },
    enabled: menteeIds.length > 0,
  });
  const menteeMap = new Map(menteeProfiles.map((p: any) => [p.id, p]));

  // Today / upcoming computations
  const today = new Date().toISOString().slice(0, 10);
  const pending = bookings.filter((b: any) => b.status === "pending");
  const confirmed = bookings.filter((b: any) => b.status === "confirmed");
  const todayConfirmed = confirmed.filter((b: any) => b.scheduled_date === today);
  const filteredBookings = bookings.filter((b: any) => b.status === bookingFilter);

  const handleConfirm = (id: string) => updateStatus.mutate({ id, status: "confirmed" });
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
    }, { onSuccess: () => setDeclineBookingId(null) });
  };

  const thisMonthEarnings = earnings?.thisMonth || 0;

  const { percent: completionPct } = computeProfileCompletion({
    ...(profile as any),
    headline: profile?.headline || mentorProfile?.title || mentorProfile?.profile?.headline,
    bio: profile?.bio || mentorProfile?.bio || mentorProfile?.bio_my,
    location: profile?.location || mentorProfile?.location,
    skills: profile?.skills?.length ? profile.skills : mentorProfile?.expertise,
    languages: profile?.languages?.length ? profile.languages : mentorProfile?.profile?.languages,
    avatar_url: profile?.avatar_url || mentorProfile?.profile?.avatar_url,
  });

  const stats = [
    { icon: Clock, value: pending.length, label: { my: "စောင့်ဆိုင်း", en: "Pending" }, color: "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300", action: () => setBookingFilter("pending") },
    { icon: CheckCircle, value: confirmed.length, label: { my: "လာမည့်", en: "Upcoming" }, color: "text-emerald bg-emerald/10", action: () => setBookingFilter("confirmed") },
    { icon: WalletCards, value: formatMoney(thisMonthEarnings, "MMK", lang), label: { my: "ဤလ", en: "This month" }, color: "text-gold-dark bg-accent/15", action: () => navigate("/mentor/finance") },
    { icon: Star, value: mentorProfile?.rating_avg?.toFixed(1) || "—", label: { my: "အမှတ်", en: "Rating" }, color: "text-primary bg-primary/10", action: () => navigate("/profile") },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-12">
      <div className="mx-auto max-w-6xl px-5 md:px-8 md:pt-2">
        <DashboardHero
          roleLabelEn="Mentor"
          roleLabelMy="လမ်းညွှန်"
          subtitleEn={`${pending.length} pending · ${todayConfirmed.length} session${todayConfirmed.length === 1 ? "" : "s"} today`}
          subtitleMy={`စောင့်ဆိုင်း ${pending.length} ခု · ဒီနေ့ session ${todayConfirmed.length} ခု`}
          ctaLabelEn="Manage availability"
          ctaLabelMy="အချိန်ဇယား စီမံရန်"
          ctaPath="/mentor/preferences"
        />
        {showSetupAlert && (
          <Alert className="mb-4 border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">
            <AlertDescription className="text-sm">
              {lang === "my"
                ? "ကြိုဆိုပါသည်! Mentor အခြေအနေတွင် နာရီနှုန်းနှင့် ရနိုင်မှု သတ်မှတ်ပါ။"
                : "Welcome! Set your hourly rate and availability in Mentor Preferences to start accepting bookings."}
            </AlertDescription>
          </Alert>
        )}

        {/* Profile completion (only if incomplete) */}
        {completionPct < 100 && (
          <motion.button onClick={() => navigate("/profile/edit")} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 w-full rounded-xl border border-border bg-card p-3.5 text-left transition-colors active:bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</p>
              <span className="text-xs font-bold text-gold-dark">{completionPct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-gold" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {lang === "my" ? "Mentee များ ရှာတွေ့စေရန် ဖြည့်ပါ" : "Complete to be discoverable by mentees"}
            </p>
          </motion.button>
        )}

        {/* Needs attention banner */}
        {(pending.length > 0 || todayConfirmed.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-700 dark:bg-amber-950">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" strokeWidth={1.75} />
              <div className="flex-1 text-xs text-amber-900 dark:text-amber-100">
                {pending.length > 0 && (
                  <p className="font-semibold">
                    {lang === "my"
                      ? `${pending.length} ခု ဘွတ်ကင် တောင်းခံချက် စောင့်နေသည်`
                      : `${pending.length} booking ${pending.length === 1 ? "request needs" : "requests need"} your response`}
                  </p>
                )}
                {todayConfirmed.length > 0 && (
                  <p className={pending.length > 0 ? "mt-0.5 text-[11px] opacity-90" : "font-semibold"}>
                    {lang === "my"
                      ? `${todayConfirmed.length} session ဒီနေ့ ရှိသည်`
                      : `${todayConfirmed.length} session${todayConfirmed.length === 1 ? "" : "s"} scheduled today`}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats — always 2x2 */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={s.action}
              className="rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">{lang === "my" ? s.label.my : s.label.en}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Quick actions row */}
        <div className="mb-6 grid grid-cols-4 gap-3 md:grid-cols-6">
          {[
            { icon: CalendarClock, my: "အချိန်ဇယား", en: "Availability", path: "/mentor/preferences", bg: "bg-gold/10", fg: "text-gold-dark" },
            { icon: Users, my: "တပည့်များ", en: "Mentees", path: "/mentors/mentees", bg: "bg-primary/10", fg: "text-primary" },
            { icon: WalletCards, my: "ငွေကြေး", en: "Earnings", path: "/mentor/finance", bg: "bg-emerald/10", fg: "text-emerald" },
            { icon: Settings, my: "ဆက်တင်", en: "Settings", path: "/settings", bg: "bg-accent/15", fg: "text-gold-dark" },
          ].map((a, i) => (
            <motion.button key={a.path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 + i * 0.04 }}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors active:bg-muted">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${a.bg}`}>
                <a.icon className={`h-5 w-5 ${a.fg}`} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? a.my : a.en}</span>
            </motion.button>
          ))}
        </div>

        {/* Bookings */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">{lang === "my" ? "Booking များ" : "Bookings"}</h2>
          <button onClick={() => navigate("/mentors/bookings")} className="flex items-center text-[11px] font-semibold text-primary">
            {lang === "my" ? "အားလုံး" : "View all"} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {["pending", "confirmed", "completed", "cancelled"].map(f => (
            <button key={f} onClick={() => setBookingFilter(f)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${bookingFilter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {filteredBookings.slice(0, 5).map((booking: any, i: number) => {
            const sc = statusConfig[booking.status] || statusConfig.pending;
            const mentee = menteeMap.get(booking.mentee_id) as any;
            return (
              <motion.div key={booking.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {mentee?.display_name?.slice(0, 2).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">{mentee?.display_name || "Mentee"}</h3>
                        {booking.topic && <p className="truncate text-[11px] text-muted-foreground">{booking.topic}</p>}
                      </div>
                      <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                        <sc.icon className="h-3 w-3" strokeWidth={1.5} />{lang === "my" ? sc.label.my : sc.label.en}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {booking.scheduled_date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {booking.scheduled_time}</span>
                    </div>
                    {booking.status === "pending" && (
                      <>
                        {booking.created_at && (
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {lang === "my" ? `လက်ခံရရှိ ${formatReceivedAgo(booking.created_at)} — ၂၄ နာရီအတွင်း တုံ့ပြန်ပါ` : `Received ${formatReceivedAgo(booking.created_at)} — respond within 24h`}
                          </p>
                        )}
                        <div className="mt-3 flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => handleDecline(booking.id)}>{lang === "my" ? "ငြင်းပယ်" : "Decline"}</Button>
                          <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={() => handleConfirm(booking.id)}>{lang === "my" ? "အတည်ပြု" : "Confirm"}</Button>
                        </div>
                      </>
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
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-10 text-center md:col-span-2">
              <Calendar className="mb-3 h-9 w-9 text-muted-foreground" strokeWidth={1} />
              <p className="text-sm font-medium text-foreground">
                {bookings.length === 0 ? (lang === "my" ? "Booking မရှိသေးပါ" : "No bookings yet") : (lang === "my" ? "ဤအခြေအနေအတွက် မရှိပါ" : "Nothing here")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {bookings.length === 0
                  ? (lang === "my" ? "Mentor Preferences တွင် ရနိုင်သော အချိန်များ သတ်မှတ်ပါ" : "Set your availability and time slots in Mentor Preferences")
                  : (lang === "my" ? "အခြားအခြေအနေတစ်ခု ရွေးပါ" : "Try another tab")}
              </p>
              {bookings.length === 0 && (
                <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate("/mentor/preferences")}>
                  {lang === "my" ? "အချိန်ဇယား ဖွင့်ရန်" : "Open Availability"}
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
              <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "အချိန်အသစ် အဆိုပြုနိုင်ပါသည်" : "You can optionally propose a new time"}</p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{lang === "my" ? "အကြောင်းပြချက်" : "Reason (optional)"}</label>
                  <Input value={declineReason} onChange={e => setDeclineReason(e.target.value)} className="rounded-xl" />
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">{lang === "my" ? "📅 အချိန်အသစ်" : "📅 Propose new time"}</p>
                  <div className="flex gap-2">
                    <Input type="date" value={proposedDate} onChange={e => setProposedDate(e.target.value)} className="flex-1 rounded-xl text-xs" min={new Date().toISOString().split("T")[0]} />
                    <Input type="time" value={proposedTime} onChange={e => setProposedTime(e.target.value)} className="w-28 rounded-xl text-xs" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeclineBookingId(null)}>{lang === "my" ? "ပယ်ဖျက်" : "Cancel"}</Button>
                  <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleSubmitDecline} disabled={updateStatus.isPending}>
                    {proposedDate && proposedTime ? (lang === "my" ? "ငြင်းပယ်ပြီး အဆိုပြု" : "Decline & Propose") : (lang === "my" ? "ငြင်းပယ်မည်" : "Decline")}
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
