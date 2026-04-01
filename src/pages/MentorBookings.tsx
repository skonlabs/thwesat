import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, XCircle, MessageCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMentorBookings, useUpdateBookingStatus, useCreateBooking } from "@/hooks/use-mentor-bookings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const topics = [
  { my: "အသက်မွေးမှု လမ်းညွှန်", en: "Career Coaching" },
  { my: "CV စစ်ဆေး", en: "Resume Review" },
  { my: "အင်တာဗျူး ပြင်ဆင်", en: "Interview Prep" },
  { my: "နည်းပညာ လမ်းညွှန်", en: "Technical Guidance" },
];

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = {
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
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = useMentorBookings();
  const updateStatus = useUpdateBookingStatus();
  const createBooking = useCreateBooking();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");

  // Fetch mentee profiles
  const menteeIds = [...new Set(bookings.map((b: any) => b.mentee_id))];
  const { data: menteeProfiles = [] } = useQuery({
    queryKey: ["booking-mentee-profiles", menteeIds],
    queryFn: async () => {
      if (!menteeIds.length) return [];
      const { data } = await supabase.from("profiles").select("id, display_name, headline, avatar_url").in("id", menteeIds);
      return data || [];
    },
    enabled: menteeIds.length > 0,
  });
  const menteeMap = new Map(menteeProfiles.map((p: any) => [p.id, p]));

  const filtered = filter === "all" ? bookings : bookings.filter((b: any) => b.status === filter);
  const pendingCount = bookings.filter((b: any) => b.status === "pending").length;

  const handleConfirm = (id: string) => {
    updateStatus.mutate({ id, status: "confirmed" }, {
      onSuccess: () => {},
    });
  };

  const handleDecline = (id: string) => {
    updateStatus.mutate({ id, status: "cancelled" }, {
      onSuccess: () => {},
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "Booking များ" : "Bookings"} />
      <div className="px-5">
        {/* Summary */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { value: pendingCount, label: lang === "my" ? "စောင့်ဆိုင်း" : "Pending", color: "text-primary" },
            { value: bookings.filter((b: any) => b.status === "confirmed").length, label: lang === "my" ? "အတည်ပြု" : "Confirmed", color: "text-emerald" },
            { value: bookings.filter((b: any) => b.status === "completed").length, label: lang === "my" ? "ပြီးဆုံး" : "Done", color: "text-muted-foreground" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-border bg-card p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {(["all", "pending", "confirmed", "completed"] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f].label.my : statusConfig[f].label.en)}
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[9px] font-bold text-primary">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((booking: any, i: number) => {
              const sc = statusConfig[booking.status] || statusConfig.pending;
              const mentee = menteeMap.get(booking.mentee_id);
              return (
                <motion.div key={booking.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{mentee?.display_name?.slice(0, 2).toUpperCase() || "?"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">{mentee?.display_name || "Mentee"}</h3>
                          <p className="truncate text-[11px] text-muted-foreground">{booking.topic || ""}</p>
                        </div>
                        <span className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                          <sc.icon className="h-3 w-3" strokeWidth={1.5} />{lang === "my" ? sc.label.my : sc.label.en}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" strokeWidth={1.5} /> {booking.scheduled_date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> {booking.scheduled_time}</span>
                      </div>
                      {booking.status === "pending" && booking.booked_by === "mentee" && (
                        <div className="mt-3 flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => handleDecline(booking.id)}>{lang === "my" ? "ငြင်းပယ်" : "Decline"}</Button>
                          <Button variant="default" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => handleConfirm(booking.id)}>{lang === "my" ? "အတည်ပြု" : "Confirm"}</Button>
                        </div>
                      )}
                      {booking.status === "confirmed" && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => navigate("/messages")}>
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
        )}
      </div>
    </div>
  );
};

export default MentorBookings;
