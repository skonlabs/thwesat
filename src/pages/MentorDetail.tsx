import { useState } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Calendar, MessageCircle, Clock, ThumbsDown, ThumbsUp, Heart, Briefcase, Building2, Sparkles, ChevronDown } from "lucide-react";
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
import { formatMoney } from "@/lib/finance";

const MentorDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const { startConversation } = useStartConversation();
  const { data: mentor, isLoading } = useMentorProfile(id);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

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
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const targets = (adminRoles && adminRoles.length > 0 ? adminRoles : []) as { user_id: string }[];
      await Promise.all(
        targets.map((t) =>
          supabase.from("notifications").insert({
            user_id: t.user_id,
            notification_type: "profile_report",
            title: "Profile report",
            description: `Profile report for user ${id}: ${reportReason}`,
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
  const isNew = (mentor.rating_avg || 0) === 0;
  const rateLabel = mentor.hourly_rate
    ? `${formatMoney(mentor.hourly_rate, "MMK", lang)}/hr`
    : (lang === "my" ? "အခမဲ့" : "Free");

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်သူ" : "Mentor"} backPath="/mentors" />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Editorial Hero Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" aria-hidden />
            <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />

            <div className="relative flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-card bg-card p-0.5">
                  <UserStatusBadge status={mentor.status || "offline"} size="md" />
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h1 className="text-lg font-bold leading-tight text-foreground">{displayName}</h1>
                  {isNew ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-default items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                            <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
                            {lang === "my" ? "အသစ်" : "New"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[200px] text-xs">
                            {lang === "my"
                              ? "ဤ Mentor သည် Platform တွင် အသစ်ဝင်ရောက်ကာ track record တည်ဆောက်နေပါသည်။"
                              : "This mentor is new and building their track record."}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <Star className="h-3 w-3 fill-primary text-primary" strokeWidth={1.5} />
                      {mentor.rating_avg}
                    </span>
                  )}
                </div>
                {mentor.title && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground/80">
                    <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <span className="truncate">{mentor.title}</span>
                  </p>
                )}
                {mentor.company && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{mentor.company}</span>
                  </p>
                )}
                {mentor.location && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{mentor.location}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Stat row */}
            <div className="relative mt-4 grid grid-cols-3 divide-x divide-border rounded-xl bg-background/60 py-2.5 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{mentor.total_sessions || 0}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{lang === "my" ? "ချိန်းဆိုမှု" : "Sessions"}</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{mentor.total_mentees || 0}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{lang === "my" ? "လူဦးရေ" : "Mentees"}</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-primary">{rateLabel}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{lang === "my" ? "နှုန်းထား" : "Rate"}</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="relative mt-4 flex gap-2">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl bg-background/70" onClick={() => id && startConversation(id)}>
                <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
              </Button>
              <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => navigate(`/mentors/book?mentorId=${id}`)}>
                <Calendar className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "ချိန်းဆိုရန်" : "Book Session"}
              </Button>
            </div>
          </div>

          {/* About */}
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကိုယ်ရေးအကျဉ်း" : "About"}</h2>
            <p className="text-sm leading-relaxed text-foreground/80">
              {(lang === "my" ? (mentor.bio_my || mentor.bio) : (mentor.bio || mentor.bio_my)) || (
                <span className="italic text-muted-foreground">{lang === "my" ? "ကိုယ်ရေးအကျဉ်း မထည့်ရသေးပါ" : "This mentor hasn't added a bio yet"}</span>
              )}
            </p>
          </section>

          {/* Expertise */}
          {mentor.expertise && mentor.expertise.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Expertise"}</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((s) => (
                  <span key={s} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{s}</span>
                ))}
              </div>
            </section>
          )}

          {/* Next slot */}
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "နောက်ရရှိနိုင်ချိန်" : "Next Available"}</h2>
              <span className="text-[10px] text-muted-foreground">
                {`Times in ${(mentor as any)?.timezone || "mentor's local time"}`}
              </span>
            </div>
            {nextSlot ? (
              <button
                onClick={() => navigate(`/mentors/book?mentorId=${id}`)}
                className="block w-full rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
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
                  {totalSlots > 1 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      +{totalSlots - 1}
                    </span>
                  )}
                </div>
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-3.5">
                <p className="text-xs text-muted-foreground">
                  {lang === "my"
                    ? "လက်ရှိ အချိန်ဇယား မရှိသေးပါ။ ချိန်းဆိုရန် နှိပ်၍ အချိန်တောင်းဆိုနိုင်ပါသည်။"
                    : "No open slots right now. Tap Book to request a session time."}
                </p>
              </div>
            )}
          </section>

          {/* Reviews — summary + show all */}
          {reviews.length > 0 && (() => {
            const total = reviews.length;
            const dislike = reviews.filter((r: any) => r.rating <= 2).length;
            const like = reviews.filter((r: any) => r.rating === 3 || r.rating === 4).length;
            const love = reviews.filter((r: any) => r.rating >= 5).length;
            const avg = (reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / total).toFixed(1);
            const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;
            const buckets = [
              { key: "love", label_en: "Love it", label_my: "အရမ်းကြိုက်", count: love, Icon: Heart, color: "text-accent", fill: "fill-accent", bar: "bg-accent" },
              { key: "like", label_en: "Like it", label_my: "ကြိုက်ပါတယ်", count: like, Icon: ThumbsUp, color: "text-primary", fill: "fill-primary/30", bar: "bg-primary" },
              { key: "dislike", label_en: "Don't like", label_my: "မကြိုက်ပါ", count: dislike, Icon: ThumbsDown, color: "text-destructive", fill: "fill-destructive/20", bar: "bg-destructive" },
            ];
            return (
              <section className="mt-6">
                <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "သုံးသပ်ချက်များ" : "Reviews"}</h2>
                <div className="mb-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold leading-none text-foreground">{avg}</p>
                      <div className="mt-1 flex items-center justify-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < Math.round(Number(avg)) ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
                        ))}
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {total} {lang === "my" ? "သုံးသပ်ချက်" : total === 1 ? "review" : "reviews"}
                      </p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {buckets.map(b => (
                        <div key={b.key} className="flex items-center gap-2">
                          <b.Icon className={`h-3.5 w-3.5 shrink-0 ${b.color} ${b.count > 0 ? b.fill : ""}`} strokeWidth={1.5} />
                          <span className="w-16 text-[10px] font-medium text-foreground">{lang === "my" ? b.label_my : b.label_en}</span>
                          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full ${b.bar} transition-all`} style={{ width: `${pct(b.count)}%` }} />
                          </div>
                          <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">{b.count} · {pct(b.count)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {visibleReviews.map((r: any) => (
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
                {reviews.length > 2 && (
                  <button
                    onClick={() => setShowAllReviews(v => !v)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
                  >
                    {showAllReviews
                      ? (lang === "my" ? "လျှော့ပြရန်" : "Show less")
                      : (lang === "my" ? `သုံးသပ်ချက် ${reviews.length} ခုလုံးကြည့်ရန်` : `Show all ${reviews.length} reviews`)}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllReviews ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </button>
                )}
              </section>
            );
          })()}

          <div className="mt-8 pb-2 text-center">
            <button
              onClick={() => setReportOpen(true)}
              className="text-[11px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {lang === "my" ? "ဤပရိုဖိုင်ကို တိုင်ကြားရန်" : "Report this profile"}
            </button>
          </div>
        </motion.div>
      </div>

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
    </div>
  );
};

export default MentorDetail;
