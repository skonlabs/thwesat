import { useState } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Calendar, MessageCircle, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/hooks/use-language";
import { useMentorProfile } from "@/hooks/use-mentor-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { UserStatusBadge } from "@/components/UserStatusBadge";

const MentorDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const { startConversation } = useStartConversation();
  const { data: mentor, isLoading } = useMentorProfile(id);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Fetch next available slot
  const { data: nextSlot } = useQuery({
    queryKey: ["next-available-slot", id],
    queryFn: async () => {
      if (!id) return null;
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("mentor_availability_slots")
        .select("slot_date, start_time, end_time")
        .eq("mentor_id", id)
        .eq("is_booked", false)
        .gte("slot_date", today)
        .order("slot_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1);
      if (!data || data.length === 0) return null;
      return data[0];
    },
    enabled: !!id,
  });

  const { data: totalSlots = 0 } = useQuery({
    queryKey: ["available-slots-count", id],
    queryFn: async () => {
      if (!id) return 0;
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("mentor_availability_slots")
        .select("id", { count: "exact", head: true })
        .eq("mentor_id", id)
        .eq("is_booked", false)
        .gte("slot_date", today);
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["mentor-reviews", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from("mentor_reviews").select("*").eq("mentor_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      const reviewerIds = [...new Set((data || []).map(r => r.reviewer_id))];
      if (!reviewerIds.length) return data || [];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", reviewerIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(r => ({ ...r, reviewer: pMap.get(r.reviewer_id) }));
    },
    enabled: !!id,
  });

  const handleSubmitReport = async () => {
    if (!reportReason.trim() || !id) return;
    setReportSubmitting(true);
    try {
      // Try to send to admin users via user_roles; fall back to null user_id
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const targets = adminRoles && adminRoles.length > 0 ? adminRoles : [{ user_id: null }];
      await Promise.all(
        targets.map((t: { user_id: string | null }) =>
          supabase.from("notifications").insert({
            user_id: t.user_id,
            notification_type: "profile_report",
            message: `Profile report for user ${id}: ${reportReason}`,
            link_path: "/admin/users",
          })
        )
      );
      toast.success(lang === "my" ? "Report တင်ပြီးပါပြီ" : "Report submitted. Thank you.");
      setReportOpen(false);
      setReportReason("");
    } catch {
      toast.error(lang === "my" ? "Report တင်မရပါ" : "Failed to submit report");
    } finally {
      setReportSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (!mentor) {
    return <div className="min-h-screen bg-background p-5"><PageHeader title="Mentor" backPath="/mentors" /><p className="text-center text-muted-foreground">{lang === "my" ? "မတွေ့ပါ" : "Not found"}</p></div>;
  }

  const displayName = mentor.profile?.display_name || "Mentor";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-40">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်သူ" : "Mentor"} backPath="/mentors" />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">{initials}</div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
              <UserStatusBadge status={mentor.status || "offline"} size="md" />
            </div>
            <p className="text-sm text-muted-foreground">{mentor.title}</p>
            <p className="text-xs text-muted-foreground">{mentor.company} · {mentor.location}</p>
            <div className="mt-3 flex items-center gap-4">
              {(mentor.rating_avg || 0) > 0 ? (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" strokeWidth={1.5} />
                  <span className="text-sm font-bold text-foreground">{mentor.rating_avg}</span>
                </div>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                        {lang === "my" ? "အသစ် Mentor" : "New Mentor"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[200px] text-xs">
                        {lang === "my"
                          ? "ဤ Mentor သည် Platform တွင် အသစ်ဝင်ရောက်ကာ track record တည်ဆောက်နေပါသည်။"
                          : "This mentor is new to the platform and building their track record."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {mentor.location || (lang === "my" ? "မသတ်မှတ်ရသေး" : "Not set")}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { value: mentor.total_sessions || 0, label: lang === "my" ? "ချိန်းဆိုမှု" : "Sessions" },
              { value: mentor.total_mentees || 0, label: lang === "my" ? "လူဦးရေ" : "Mentees" },
              { value: mentor.hourly_rate ? `$${mentor.hourly_rate}/hr` : (lang === "my" ? "အခမဲ့" : "Free"), label: lang === "my" ? "နှုန်းထား" : "Rate" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကိုယ်ရေးအကျဉ်း" : "About"}</h2>
            <p className="text-sm leading-relaxed text-foreground/80">
              {(lang === "my" ? (mentor.bio_my || mentor.bio) : (mentor.bio || mentor.bio_my)) || (
                <span className="text-muted-foreground italic">{lang === "my" ? "ကိုယ်ရေးအကျဉ်း မထည့်ရသေးပါ" : "This mentor hasn't added a bio yet"}</span>
              )}
            </p>
          </div>

          {mentor.expertise && mentor.expertise.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Expertise"}</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((s) => (
                  <span key={s} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "နောက်ရရှိနိုင်ချိန်" : "Next Available Slot"}</h2>
              <span className="text-[10px] text-muted-foreground">
                {lang === "my"
                  ? `Times in ${(mentor as any)?.timezone || "mentor's local time"}`
                  : `Times in ${(mentor as any)?.timezone || "mentor's local time"}`}
              </span>
            </div>
            {nextSlot ? (
              <div className="rounded-xl border border-border bg-card p-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {new Date(nextSlot.slot_date + "T00:00:00").toLocaleDateString(lang === "my" ? "my" : "en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" strokeWidth={1.5} />
                      {nextSlot.start_time} – {nextSlot.end_time}
                    </div>
                  </div>
                </div>
                {totalSlots > 1 && (
                  <p className="mt-2.5 text-[11px] text-muted-foreground">
                    {lang === "my"
                      ? `နောက်ထပ် ${totalSlots - 1} ခုရှိပါသေးသည်။ ချိန်းဆိုရန် နှိပ်ပါ။`
                      : `${totalSlots - 1} more slot${totalSlots - 1 > 1 ? "s" : ""} available — tap Book to see all times.`}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-3.5">
                <p className="text-xs text-muted-foreground">
                  {lang === "my"
                    ? "လက်ရှိ အချိန်ဇယား မရှိသေးပါ။ ချိန်းဆိုရန် နှိပ်၍ အချိန်တောင်းဆိုနိုင်ပါသည်။"
                    : "No open slots right now. Tap Book to request a session time."}
                </p>
              </div>
            )}
          </div>

          {reviews.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "သုံးသပ်ချက်များ" : "Reviews"}</h2>
              <div className="space-y-3">
                {reviews.map((r: any) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-3.5">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{r.reviewer?.display_name || "User"}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: r.rating }).map((_, j) => (
                          <Star key={j} className="h-3 w-3 fill-primary text-primary" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground/80">{lang === "my" ? (r.review_text_my || r.review_text) : (r.review_text || r.review_text_my)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 pb-2 text-center">
            <button
              onClick={() => setReportOpen(true)}
              className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              {lang === "my" ? "ဤပရိုဖိုင်ကို တိုင်ကြားရန်" : "Report this profile"}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Report AlertDialog */}
      <AlertDialog open={reportOpen} onOpenChange={setReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "my" ? "ပရိုဖိုင် တိုင်ကြားရန်" : "Report this profile"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "my"
                ? "တိုင်ကြားမှု အကြောင်းရင်း ဖော်ပြပါ။ Admin team မှ စစ်ဆေးပေးပါမည်။"
                : "Describe the reason for this report. Our admin team will review it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            placeholder={lang === "my" ? "တိုင်ကြားမှု အကြောင်းရင်း..." : "Reason for reporting..."}
            className="min-h-[80px] rounded-xl"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportReason("")}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reportReason.trim() || reportSubmitting}
              onClick={(e) => { e.preventDefault(); handleSubmitReport(); }}
            >
              {reportSubmitting
                ? (lang === "my" ? "တင်နေသည်..." : "Submitting...")
                : (lang === "my" ? "တိုင်ကြားမည်" : "Submit Report")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-md gap-3">
          <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => id && startConversation(id)}>
            <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
          </Button>
          <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => navigate(`/mentors/book?mentorId=${id}`)}>
            <Calendar className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "ချိန်းဆိုရန်" : "Book"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MentorDetail;
