import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Clock, DollarSign, Star, Users, TrendingUp,
  CheckCircle, XCircle, MessageCircle, ChevronRight,
  Edit3, Shield, Sparkles, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const mockBookings = [
  { id: 1, name: "Thiri Win", nameMy: "သီရိဝင်း", topic: "Career Advice", topicMy: "အသက်မွေးမှု အကြံဉာဏ်", date: "Apr 2", time: "10:00 AM", status: "pending", avatar: "TW" },
  { id: 2, name: "Aung Kyaw", nameMy: "အောင်ကျော်", topic: "CV Review", topicMy: "CV ပြန်ကြည့်", date: "Apr 3", time: "2:00 PM", status: "confirmed", avatar: "AK" },
  { id: 3, name: "Hnin Si", nameMy: "နှင်းဆီ", topic: "Interview Prep", topicMy: "အင်တာဗျူး ပြင်ဆင်", date: "Mar 28", time: "11:00 AM", status: "completed", avatar: "HS" },
  { id: 4, name: "Zaw Min", nameMy: "ဇော်မင်း", topic: "Remote Work Tips", topicMy: "Remote Work အကြံပြု", date: "Mar 25", time: "3:00 PM", status: "completed", avatar: "ZM" },
];

const availabilityDays = [
  { day: "Mon", dayMy: "တနင်္လာ" },
  { day: "Tue", dayMy: "အင်္ဂါ" },
  { day: "Wed", dayMy: "ဗုဒ္ဓဟူး" },
  { day: "Thu", dayMy: "ကြာသပတေး" },
  { day: "Fri", dayMy: "သောကြာ" },
  { day: "Sat", dayMy: "စနေ" },
  { day: "Sun", dayMy: "တနင်္ဂနွေ" },
];

const quickActions = [
  { icon: MessageCircle, label: "အသိုင်း", labelEn: "Community", path: "/community", bg: "bg-primary/10", fg: "text-primary" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Sparkles, label: "အသက်မွေးမှု Tools", labelEn: "Career Tools", path: "/ai-tools", bg: "bg-accent/10", fg: "text-accent" },
  { icon: Eye, label: "ပရိုဖိုင်ကြည့်", labelEn: "View Profile", path: "/mentors/detail", bg: "bg-primary/10", fg: "text-primary" },
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
  const { toast } = useToast();
  const [hourlyRate, setHourlyRate] = useState("30");
  const [activeDays, setActiveDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [bookingFilter, setBookingFilter] = useState("all");
  const [bookings, setBookings] = useState(mockBookings);

  const toggleDay = (day: string) => {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleConfirm = (id: number) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "confirmed" } : b));
    toast({ title: lang === "my" ? "Booking အတည်ပြုပြီး ✓" : "Booking confirmed ✓" });
  };

  const handleDecline = (id: number) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    toast({ title: lang === "my" ? "Booking ပယ်ဖျက်ပြီး" : "Booking declined" });
  };

  const filteredBookings = bookingFilter === "all" ? bookings : bookings.filter(b => b.status === bookingFilter);

  const stats = [
    { icon: Calendar, label: { my: "စုစုပေါင်း Booking", en: "Total Bookings" }, value: "24", color: "text-primary bg-primary/10" },
    { icon: Star, label: { my: "အမှတ်", en: "Rating" }, value: "4.8", color: "text-emerald bg-emerald/10" },
    { icon: DollarSign, label: { my: "ဤလ ဝင်ငွေ", en: "This Month" }, value: "$360", color: "text-accent bg-accent/10" },
    { icon: Users, label: { my: "Mentee", en: "Mentees" }, value: "18", color: "text-primary bg-primary/10" },
  ];

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "Mentor Dashboard" : "Mentor Dashboard"} />
      <div className="px-5">
        {/* Profile Completion */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</p>
            <span className="text-xs font-bold text-primary">75%</span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div initial={{ width: 0 }} animate={{ width: "75%" }} transition={{ delay: 0.3, duration: 0.6 }} className="h-full rounded-full bg-primary" />
          </div>
          <button onClick={() => navigate("/profile/edit")} className="text-xs font-semibold text-primary">
            {lang === "my" ? "ပြင်ဆင်ရန်" : "Complete now"} →
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-3.5">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.path + action.labelEn}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors active:bg-muted"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.bg}`}>
                <action.icon className={`h-4 w-4 ${action.fg}`} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-medium text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </motion.button>
          ))}
        </div>

        {/* Availability & Rate Settings */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{lang === "my" ? "ရနိုင်မှု & နှုန်းထား" : "Availability & Rate"}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{isAvailable ? (lang === "my" ? "ရနိုင်" : "Available") : (lang === "my" ? "မရနိုင်" : "Unavailable")}</span>
              <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
            </div>
          </div>

          {/* Hourly Rate */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-foreground">{lang === "my" ? "နာရီစျေးနှုန်း (USD)" : "Hourly Rate (USD)"}</label>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <Input
                type="number"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
                className="h-10 w-24 rounded-xl text-center"
              />
              <span className="text-xs text-muted-foreground">/ {lang === "my" ? "နာရီ" : "hour"}</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto rounded-lg text-xs"
                onClick={() => toast({ title: lang === "my" ? "နှုန်းထား သိမ်းပြီး ✓" : "Rate saved ✓" })}
              >
                {lang === "my" ? "သိမ်းရန်" : "Save"}
              </Button>
            </div>
          </div>

          {/* Available Days */}
          <div>
            <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "ရနိုင်သောရက်များ" : "Available Days"}</label>
            <div className="flex gap-1.5">
              {availabilityDays.map(d => (
                <button
                  key={d.day}
                  onClick={() => toggleDay(d.day)}
                  className={`flex-1 rounded-lg py-2 text-center text-[10px] font-medium transition-colors ${
                    activeDays.includes(d.day)
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {lang === "my" ? d.dayMy.slice(0, 2) : d.day}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Earnings Summary */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-5 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "ဝင်ငွေ အကျဉ်းချုပ်" : "Earnings Summary"}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-bold text-foreground">$360</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ဤလ" : "This Month"}</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-bold text-foreground">$1,240</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "စုစုပေါင်း" : "All Time"}</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-bold text-foreground">$280</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ထုတ်ယူနိုင်" : "Withdrawable"}</p>
            </div>
          </div>
        </motion.div>

        {/* Booking Requests */}
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
          {filteredBookings.map((booking, i) => {
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{booking.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? booking.nameMy : booking.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{lang === "my" ? booking.topicMy : booking.topic}</p>
                      </div>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                        <sc.icon className="h-3 w-3" strokeWidth={1.5} />
                        {lang === "my" ? sc.label.my : sc.label.en}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" strokeWidth={1.5} /> {booking.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> {booking.time}</span>
                    </div>

                    {booking.status === "pending" && (
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
          {filteredBookings.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <Calendar className="mb-3 h-10 w-10 text-muted-foreground" strokeWidth={1} />
              <p className="text-sm font-medium text-foreground">{lang === "my" ? "Booking မရှိပါ" : "No bookings"}</p>
            </div>
          )}
        </div>

        {/* Community Stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-6 mt-6 rounded-xl bg-primary p-5">
          <h3 className="mb-4 text-sm font-bold text-primary-foreground">
            {lang === "my" ? "ကျွန်ုပ်တို့ အသိုင်းအဝိုင်း" : "Our Community"}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "5K+", label: lang === "my" ? "အဖွဲ့ဝင်" : "Members" },
              { value: "200+", label: lang === "my" ? "အလုပ်" : "Jobs" },
              { value: "50+", label: lang === "my" ? "လမ်းညွှန်သူ" : "Mentors" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-primary-foreground/15 p-3 text-center">
                <p className="text-lg font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MentorDashboard;
