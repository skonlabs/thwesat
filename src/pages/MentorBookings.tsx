import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, XCircle, MessageCircle, Star, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useMentorBookings, useUpdateBookingStatus, useMarkSessionComplete, useSendBookingNotification } from "@/hooks/use-mentor-bookings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = {
  pending: { label: { my: "စောင့်ဆိုင်း", en: "Pending" }, color: "text-primary bg-primary/10", icon: Clock },
  confirmed: { label: { my: "အတည်ပြုပြီး", en: "Confirmed" }, color: "text-emerald bg-emerald/10", icon: CheckCircle },
  completed: { label: { my: "ပြီးဆုံး", en: "Completed" }, color: "text-muted-foreground bg-muted", icon: CheckCircle },
  cancelled: { label: { my: "ပယ်ဖျက်", en: "Cancelled" }, color: "text-destructive bg-destructive/10", icon: XCircle },
};

type FilterType = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const MentorBookings = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading } = useMentorBookings();
  const updateStatus = useUpdateBookingStatus();
  const markComplete = useMarkSessionComplete();
  const sendNotification = useSendBookingNotification();
  const [filter, setFilter] = useState<FilterType>("all");

  // Rating state
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [ratingMentorId, setRatingMentorId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingText, setRatingText] = useState("");

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user || !ratingBookingId || !ratingMentorId) throw new Error("Missing data");
      const { error } = await supabase.from("mentor_reviews").insert({
        mentor_id: ratingMentorId,
        reviewer_id: user.id,
        booking_id: ratingBookingId,
        rating: ratingValue,
        review_text: ratingText,
      });
      if (error) throw error;
      const { data: reviewerProfile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      const reviewerName = reviewerProfile?.display_name || "A mentee";
      await supabase.from("notifications").insert({
        user_id: ratingMentorId,
        notification_type: "mentor",
        title: `⭐ New ${ratingValue}-star review from ${reviewerName}`,
        title_my: `⭐ ${reviewerName} ထံမှ ${ratingValue}-star အဆင့်သတ်မှတ်ချက်`,
        description: ratingText || "Your mentee left you a review.",
        description_my: ratingText || "သင့် mentee က အဆင့်သတ်မှတ်ချက် ပေးခဲ့သည်။",
        link_path: "/mentors/dashboard",
      });
    },
    onSuccess: () => {
      toast({ title: lang === "my" ? "အဆင့်သတ်မှတ်ပြီးပါပြီ" : "Review submitted!" });
      setRatingBookingId(null);
      setRatingText("");
      setRatingValue(5);
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
    },
  });

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

  const isMentor = (booking: any) => booking.mentor_id === user?.id;
  const isMentee = (booking: any) => booking.mentee_id === user?.id;

  const hasMyCompletion = (booking: any) => {
    if (isMentor(booking)) return !!(booking as any).mentor_completed_at;
    if (isMentee(booking)) return !!(booking as any).mentee_completed_at;
    return false;
  };

  const bothCompleted = (booking: any) =>
    !!(booking as any).mentor_completed_at && !!(booking as any).mentee_completed_at;

  const handleMarkComplete = (booking: any) => {
    const role = isMentor(booking) ? "mentor" : "mentee";
    markComplete.mutate({ id: booking.id, role });
  };

  const handleConfirm = (id: string) => updateStatus.mutate({ id, status: "confirmed" });
  const handleDecline = (id: string) => updateStatus.mutate({ id, status: "cancelled" });

  const handleAcceptProposal = async (booking: any) => {
    if (!user) return;
    // Create a new booking with the proposed date/time
    const { error } = await supabase.from("mentor_bookings").insert({
      mentor_id: booking.mentor_id,
      mentee_id: booking.mentee_id,
      scheduled_date: booking.proposed_date,
      scheduled_time: booking.proposed_time,
      topic: booking.topic,
      message: booking.message,
      goals: booking.goals,
      booked_by: "mentee",
      status: "confirmed",
    });
    if (error) {
      toast({ title: lang === "my" ? "အမှားဖြစ်ပွားပါသည်" : "Error accepting proposal", variant: "destructive" });
      return;
    }

    // Send confirmation notification back to mentor
    await sendNotification.mutateAsync({
      recipientId: booking.mentor_id,
      senderId: user.id,
      type: "booking_confirmed",
      bookingDate: booking.proposed_date,
      bookingTime: booking.proposed_time,
    });

    toast({ title: lang === "my" ? "အချိန်အသစ် လက်ခံပြီး" : "New time accepted!" });
    queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "Booking များ" : "Bookings"} backPath="/mentors/dashboard" />
      <div className="px-5">
        {/* Summary */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { value: pendingCount, label: lang === "my" ? "စောင့်ဆိုင်း" : "Pending", color: "text-primary", filterVal: "pending" as FilterType },
            { value: bookings.filter((b: any) => b.status === "confirmed").length, label: lang === "my" ? "အတည်ပြု" : "Confirmed", color: "text-emerald", filterVal: "confirmed" as FilterType },
            { value: bookings.filter((b: any) => b.status === "completed").length, label: lang === "my" ? "ပြီးဆုံး" : "Done", color: "text-muted-foreground", filterVal: "completed" as FilterType },
          ].map((s, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setFilter(s.filterVal)} className={`rounded-xl border bg-card p-3 text-center transition-colors active:bg-muted/30 ${filter === s.filterVal ? "border-primary" : "border-border"}`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.button>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {(["all", "pending", "confirmed", "completed", "cancelled"] as FilterType[]).map(f => {
            const declinedCount = f === "cancelled" ? bookings.filter((b: any) => b.status === "cancelled").length : 0;
            const counterProposalCount = f === "cancelled" ? bookings.filter((b: any) => b.status === "cancelled" && b.proposed_date).length : 0;
            return (
              <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
                {f === "all" ? (lang === "my" ? "အားလုံး" : "All")
                  : f === "cancelled" ? (lang === "my" ? "ငြင်းပယ်" : "Declined")
                  : (lang === "my" ? statusConfig[f].label.my : statusConfig[f].label.en)}
                {f === "pending" && pendingCount > 0 && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[9px] font-bold text-primary">{pendingCount}</span>
                )}
                {f === "cancelled" && counterProposalCount > 0 && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{counterProposalCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((booking: any, i: number) => {
              const sc = statusConfig[booking.status] || statusConfig.pending;
              const mentee = menteeMap.get(booking.mentee_id);
              const myCompleted = hasMyCompletion(booking);
              const fullyDone = bothCompleted(booking);

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
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" strokeWidth={1.5} /> {booking.scheduled_date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> {booking.scheduled_time}</span>
                        {booking.payment_status && booking.payment_status !== "unpaid" && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            booking.payment_status === "paid" ? "bg-emerald/10 text-emerald" :
                            booking.payment_status === "pending" ? "bg-yellow-500/10 text-yellow-600" :
                            "bg-destructive/10 text-destructive"
                          }`}>
                            {booking.payment_status === "paid" && (lang === "my" ? "ပေးချေပြီး" : "Paid")}
                            {booking.payment_status === "pending" && (lang === "my" ? "ပေးချေမှု စစ်ဆေးနေသည်" : "Payment pending")}
                            {booking.payment_status === "refunded" && (lang === "my" ? "ပြန်အမ်းပြီး" : "Refunded")}
                          </span>
                        )}
                        {booking.payment_status === "unpaid" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {lang === "my" ? "မပေးချေရသေး" : "Unpaid"}
                          </span>
                        )}
                      </div>

                      {/* Pending: confirm/decline (mentor only) */}
                      {booking.status === "pending" && booking.booked_by === "mentee" && isMentor(booking) && (
                        <div className="mt-3 flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => handleDecline(booking.id)}>{lang === "my" ? "ငြင်းပယ်" : "Decline"}</Button>
                          <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={() => handleConfirm(booking.id)}>{lang === "my" ? "အတည်ပြု" : "Confirm"}</Button>
                        </div>
                      )}

                      {/* Confirmed: message + mark complete */}
                      {booking.status === "confirmed" && (
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => navigate("/messages")}>
                              <MessageCircle className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
                            </Button>
                            {!myCompleted && (
                              <Button
                                variant="default"
                                size="sm"
                                className="rounded-lg text-xs"
                                disabled={markComplete.isPending}
                                onClick={() => handleMarkComplete(booking)}
                              >
                                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                {lang === "my" ? "Session ပြီးဆုံးကြောင်း အတည်ပြုရန်" : "Mark Complete"}
                              </Button>
                            )}
                          </div>
                          {myCompleted && !fullyDone && (
                            <p className="text-right text-[10px] text-emerald font-medium">
                              ✓ {lang === "my" ? "သင် အတည်ပြုပြီးပါပြီ။ အခြားတစ်ဖက် အတည်ပြုရန် စောင့်ပါ" : "You confirmed. Waiting for the other party to confirm."}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Completed: show rating button (mentee only, after both confirm) */}
                      {booking.status === "completed" && fullyDone && isMentee(booking) && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs"
                            onClick={() => {
                              setRatingBookingId(booking.id);
                              setRatingMentorId(booking.mentor_id);
                            }}
                          >
                            <Star className="mr-1 h-3.5 w-3.5 text-accent" /> {lang === "my" ? "အဆင့်သတ်မှတ်ရန်" : "Rate this session"}
                          </Button>
                        </div>
                      )}

                      {/* Completed info */}
                      {booking.status === "completed" && fullyDone && (
                        <p className="mt-2 text-[10px] text-emerald font-medium">
                          ✓ {lang === "my" ? "နှစ်ဦးစလုံး အတည်ပြုပြီးပါပြီ" : "Both parties confirmed completion"}
                        </p>
                      )}

                      {/* Counter-proposal from mentor */}
                      {booking.status === "cancelled" && booking.proposed_date && booking.proposed_time && isMentee(booking) && (
                        <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
                          <p className="mb-1 text-xs font-medium text-foreground">
                            🔄 {lang === "my" ? "Mentor မှ အချိန်အသစ် အဆိုပြုထားပါသည်" : "Mentor proposed a new time"}
                          </p>
                          <div className="mb-2 flex items-center gap-3 text-xs text-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" strokeWidth={1.5} /> {booking.proposed_date}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> {booking.proposed_time}</span>
                          </div>
                          {booking.decline_reason && (
                            <p className="mb-2 text-[11px] text-muted-foreground italic">"{booking.decline_reason}"</p>
                          )}
                          <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={() => handleAcceptProposal(booking)}>
                            {lang === "my" ? "အချိန်အသစ် လက်ခံမည်" : "Accept New Time"}
                          </Button>
                        </div>
                      )}

                      {/* Decline reason without proposal */}
                      {booking.status === "cancelled" && booking.decline_reason && !booking.proposed_date && (
                        <p className="mt-2 text-[11px] text-muted-foreground italic">
                          {lang === "my" ? "အကြောင်းပြချက်: " : "Reason: "}"{booking.decline_reason}"
                        </p>
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

      {/* Rating Sheet */}
      <Sheet open={!!ratingBookingId} onOpenChange={(open) => { if (!open) setRatingBookingId(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-24">
          <SheetHeader>
            <SheetTitle className="text-base">{lang === "my" ? "Session ကို အဆင့်သတ်မှတ်ပါ" : "Rate this Session"}</SheetTitle>
            <SheetDescription className="text-xs">
              {lang === "my" ? "သင်၏ အတွေ့အကြုံကို မျှဝေပါ" : "Share your experience with this session"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <button key={v} onClick={() => setRatingValue(v)}>
                  <Star
                    className={`h-8 w-8 transition-colors ${v <= ratingValue ? "fill-accent text-accent" : "text-muted-foreground"}`}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={ratingText}
              onChange={e => setRatingText(e.target.value)}
              placeholder={lang === "my" ? "သင်၏ အကြံပြုချက် (ရွေးချယ်ခွင့်)" : "Your feedback (optional)"}
              className="min-h-[80px] rounded-xl"
            />
            <Button
              variant="default"
              size="lg"
              className="w-full rounded-xl"
              disabled={submitReview.isPending}
              onClick={() => submitReview.mutate()}
            >
              {submitReview.isPending
                ? (lang === "my" ? "တင်နေသည်..." : "Submitting...")
                : (lang === "my" ? "အဆင့်သတ်မှတ်ရန်" : "Submit Review")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MentorBookings;
