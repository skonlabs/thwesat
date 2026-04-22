import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, CheckCircle, XCircle, Clock, Shield, Briefcase, CreditCard, CalendarCheck, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const removalReasons = [
  { my: "အလိမ်/စပမ်", en: "Scam/Spam" },
  { my: "နိုင်ငံရေး အကြောင်းအရာ", en: "Political Content" },
  { my: "ပုဂ္ဂိုလ်ရေး တိုက်ခိုက်မှု", en: "Personal Attack" },
  { my: "မသင့်တော်သော အကြောင်းအရာ", en: "Inappropriate Content" },
  { my: "ထပ်နေသော ပို့စ်", en: "Duplicate" },
  { my: "အခြား", en: "Other" },
];

const jobChecklist = [
  { my: "ကုမ္ပဏီအမည် မှန်ကန်သည်", en: "Company name verified" },
  { my: "အလုပ်ဖော်ပြချက် ပြည့်စုံသည်", en: "Job description complete" },
  { my: "လိမ်လည်မှု မရှိ", en: "No scam indicators" },
  { my: "လုပ်ခလစာ သင့်တင့်သည်", en: "Salary is reasonable" },
];

const ModeratorDashboard = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const queryClient = useQueryClient();

  // Community posts state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showRemoval, setShowRemoval] = useState(false);
  const [removalReason, setRemovalReason] = useState("");

  // Job state
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobChecks, setJobChecks] = useState<boolean[]>(jobChecklist.map(() => false));
  const [showJobReject, setShowJobReject] = useState(false);
  const [jobRejectReason, setJobRejectReason] = useState("");

  // Payment state
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState("");

  // Booking state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // ─── COMMUNITY POSTS ───
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["moderator-pending-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("community_posts").select("*").eq("is_approved", false).order("created_at", { ascending: false });
      if (error) throw error;
      const authorIds = [...new Set((data || []).map(p => p.author_id))];
      if (!authorIds.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", authorIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(p => ({ ...p, author: pMap.get(p.author_id) }));
    },
  });

  // ─── PENDING JOBS ───
  const { data: pendingJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["moderator-pending-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ─── PAYMENT REQUESTS ───
  const { data: paymentRequests = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["moderator-payment-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map((p: any) => p.user_id))];
      if (!userIds.length) return (data || []).map((p: any) => ({ ...p, profile: null }));
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, email").in("id", userIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map((p: any) => ({ ...p, profile: pMap.get(p.user_id) }));
    },
  });

  // ─── MENTOR BOOKINGS ───
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["moderator-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentor_bookings").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      const ids = [...new Set((data || []).flatMap((b: any) => [b.mentor_id, b.mentee_id]))];
      if (!ids.length) return (data || []).map((b: any) => ({ ...b, mentor: null, mentee: null }));
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map((b: any) => ({ ...b, mentor: pMap.get(b.mentor_id), mentee: pMap.get(b.mentee_id) }));
    },
  });

  // ─── MUTATIONS ───
  const approvePost = useMutation({
    mutationFn: async (id: string) => {
      const { data: post } = await supabase.from("community_posts").select("author_id").eq("id", id).single();
      const { error } = await supabase.from("community_posts").update({ is_approved: true, moderated_by: user?.id }).eq("id", id);
      if (error) throw error;
      if (post?.author_id) {
        await supabase.from("notifications").insert({
          user_id: post.author_id,
          notification_type: "community",
          title: "Your post has been approved! ✅",
          title_my: "သင့်ပို့စ် အတည်ပြုပြီးပါပြီ! ✅",
          description: "Your post is now visible to the community.",
          description_my: "သင့်ပို့စ်ကို community တွင် မြင်နိုင်ပါပြီ။",
          link_path: "/community",
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["moderator-pending-posts"] }); queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] }); queryClient.invalidateQueries({ queryKey: ["admin-analytics"] }); setSelectedPostId(null); toast.success(lang === "my" ? "အတည်ပြုပြီး" : "Post approved"); },
  });

  const removePost = useMutation({
    mutationFn: async (id: string) => {
      const { data: post } = await supabase.from("community_posts").select("author_id").eq("id", id).single();
      await supabase.from("community_posts").update({ moderated_by: user?.id, moderation_reason: removalReason }).eq("id", id);
      const { error } = await supabase.from("community_posts").delete().eq("id", id);
      if (error) throw error;
      if (post?.author_id) {
        await supabase.from("notifications").insert({
          user_id: post.author_id,
          notification_type: "community",
          title: "Your post was removed",
          title_my: "သင့်ပို့စ် ဖယ်ရှားခံရပါသည်",
          description: removalReason || "Your post did not meet community guidelines.",
          description_my: removalReason || "သင့်ပို့စ်သည် community လမ်းညွှန်ချက်များနှင့် ကိုက်ညီမှု မရှိပါ။",
          link_path: "/community",
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["moderator-pending-posts"] }); queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] }); queryClient.invalidateQueries({ queryKey: ["admin-analytics"] }); setSelectedPostId(null); setShowRemoval(false); setRemovalReason(""); toast.success(lang === "my" ? "ဖယ်ရှားပြီး" : "Post removed"); },
  });

  const approveJob = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").update({ status: "active", is_verified: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["moderator-pending-jobs"] }); queryClient.invalidateQueries({ queryKey: ["admin-all-jobs"] }); queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] }); queryClient.invalidateQueries({ queryKey: ["admin-analytics"] }); setSelectedJobId(null); setJobChecks(jobChecklist.map(() => false)); toast.success(lang === "my" ? "အလုပ် အတည်ပြုပြီး" : "Job approved"); },
  });

  const rejectJob = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").update({ status: "rejected", rejection_reason: jobRejectReason }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["moderator-pending-jobs"] }); queryClient.invalidateQueries({ queryKey: ["admin-all-jobs"] }); queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] }); queryClient.invalidateQueries({ queryKey: ["admin-analytics"] }); setSelectedJobId(null); setShowJobReject(false); setJobRejectReason(""); toast.success(lang === "my" ? "အလုပ် ပယ်ချပြီး" : "Job rejected"); },
  });

  // Payment: admin can approve/reject, moderator can only add note (recommend)
  const updatePayment = useMutation({
    mutationFn: async ({ id, status, admin_note }: { id: string; status: string; admin_note?: string }) => {
      const updates: any = { status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id };
      if (admin_note !== undefined) updates.admin_note = admin_note;
      const { error } = await supabase.from("payment_requests" as any).update(updates).eq("id", id);
      if (error) throw error;

      // On approval, activate premium (only admins reach here)
      if (status === "approved") {
        const { data: pr } = await supabase.from("payment_requests" as any).select("*").eq("id", id).single();
        if (pr) {
          const req = pr as any;
          if (req.payment_type === "subscription" || req.payment_type === "employer_subscription") {
            await supabase.from("profiles").update({ is_premium: true }).eq("id", req.user_id);
          }
          await supabase.from("notifications").insert({
            user_id: req.user_id,
            notification_type: "payment_approved",
            title: "Payment Approved",
            title_my: "ငွေပေးချေမှု အတည်ပြုပြီး",
            description: "Your payment has been approved.",
            description_my: "သင့်ငွေပေးချေမှုကို အတည်ပြုပြီးပါပြီ။",
            link_path: "/premium",
          });
        }
      }
      if (status === "rejected") {
        const { data: pr } = await supabase.from("payment_requests" as any).select("*").eq("id", id).single();
        if (pr) {
          await supabase.from("notifications").insert({
            user_id: (pr as any).user_id,
            notification_type: "payment_rejected",
            title: "Payment Rejected",
            title_my: "ငွေပေးချေမှု ပယ်ချခံရသည်",
            description: admin_note || "Your payment was not approved.",
            description_my: admin_note || "သင့်ငွေပေးချေမှုကို အတည်မပြုပါ။",
            link_path: "/premium",
          });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["moderator-payment-requests"] }); setSelectedPaymentId(null); setPaymentNote(""); toast.success(lang === "my" ? "အပ်ဒိတ်ပြီး" : "Payment updated"); },
  });

  // Moderator recommendation (just adds a note without changing status)
  const recommendPayment = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.from("payment_requests" as any).update({ admin_note: `[MOD] ${note}` } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["moderator-payment-requests"] }); setSelectedPaymentId(null); setPaymentNote(""); toast.success(lang === "my" ? "မှတ်ချက်ထည့်ပြီး" : "Note added for admin review"); },
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const selectedPost = posts.find((p: any) => p.id === selectedPostId);
  const selectedJob = pendingJobs.find((j: any) => j.id === selectedJobId);
  const selectedPayment = paymentRequests.find((p: any) => p.id === selectedPaymentId);
  const selectedBooking = bookings.find((b: any) => b.id === selectedBookingId);

  const pendingPayments = paymentRequests.filter((p: any) => p.status === "pending");

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { pending: "bg-warning/15 text-warning", approved: "bg-emerald/15 text-emerald", rejected: "bg-destructive/15 text-destructive", confirmed: "bg-emerald/15 text-emerald", completed: "bg-info/15 text-info", declined: "bg-destructive/15 text-destructive" };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[status] || "bg-muted text-muted-foreground"}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "စစ်ဆေးရေး ဒက်ရှ်ဘုတ်" : "Moderator Dashboard"} />
      <div className="px-5">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-4">
            <TabsTrigger value="posts" className="text-xs">{lang === "my" ? "ပို့စ်" : "Posts"}{posts.length > 0 && ` (${posts.length})`}</TabsTrigger>
            <TabsTrigger value="jobs" className="text-xs">{lang === "my" ? "အလုပ်" : "Jobs"}{pendingJobs.length > 0 && ` (${pendingJobs.length})`}</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">{lang === "my" ? "ငွေပေးချေ" : "Payments"}{pendingPayments.length > 0 && ` (${pendingPayments.length})`}</TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs">{lang === "my" ? "ချိန်းဆိုမှု" : "Bookings"}</TabsTrigger>
          </TabsList>

          {/* ─── POSTS TAB ─── */}
          <TabsContent value="posts">
            {postsLoading ? <Spinner /> : posts.length === 0 ? <EmptyState label={lang === "my" ? "စစ်ဆေးစရာ မရှိတော့ပါ!" : "All caught up!"} /> : (
              <div className="space-y-3">
                {posts.map((post: any, i: number) => (
                  <motion.button key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setSelectedPostId(post.id)} className="w-full rounded-xl border border-border bg-card p-4 text-left cursor-pointer hover:bg-muted/20 active:bg-muted/30 transition-colors">
                    <div className="mb-1 flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1">{lang === "my" ? post.content_my?.slice(0, 50) : (post.content_en || post.content_my)?.slice(0, 50)}...</h3>
                      <span className="text-[10px] text-muted-foreground">{formatTime(post.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{post.category || "general"}</span>
                      <span className="text-[10px] text-muted-foreground">by {post.author?.display_name || "User"}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── JOBS TAB ─── */}
          <TabsContent value="jobs">
            {jobsLoading ? <Spinner /> : pendingJobs.length === 0 ? <EmptyState label={lang === "my" ? "စစ်ဆေးစရာ အလုပ် မရှိပါ" : "No pending jobs"} /> : (
              <div className="space-y-3">
                {pendingJobs.map((job: any, i: number) => (
                  <motion.button key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setSelectedJobId(job.id)} className="w-full rounded-xl border border-border bg-card p-4 text-left cursor-pointer hover:bg-muted/20 active:bg-muted/30 transition-colors">
                    <div className="mb-1 flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1">{lang === "my" ? (job.title_my || job.title) : job.title}</h3>
                      <span className="text-[10px] text-muted-foreground">{formatTime(job.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{job.company}</span>
                      <span className="text-[10px] text-muted-foreground">{job.location}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── PAYMENTS TAB ─── */}
          <TabsContent value="payments">
            {paymentsLoading ? <Spinner /> : paymentRequests.length === 0 ? <EmptyState label={lang === "my" ? "ငွေပေးချေမှု မရှိပါ" : "No payment requests"} /> : (
              <div className="space-y-3">
                {paymentRequests.map((pr: any, i: number) => (
                  <motion.button key={pr.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setSelectedPaymentId(pr.id)} className="w-full rounded-xl border border-border bg-card p-4 text-left cursor-pointer hover:bg-muted/20 active:bg-muted/30 transition-colors">
                    <div className="mb-1 flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{pr.profile?.display_name || "User"}</h3>
                      <div className="flex items-center gap-2">
                        {statusBadge(pr.status)}
                        <span className="text-[10px] text-muted-foreground">{formatTime(pr.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{pr.payment_method}</span>
                      <span className="text-xs font-medium text-foreground">{pr.amount} {pr.currency}</span>
                      <span className="text-[10px] text-muted-foreground">{pr.payment_type}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── BOOKINGS TAB ─── */}
          <TabsContent value="bookings">
            {bookingsLoading ? <Spinner /> : bookings.length === 0 ? <EmptyState label={lang === "my" ? "ချိန်းဆိုမှု မရှိပါ" : "No bookings"} /> : (
              <div className="space-y-3">
                {bookings.map((bk: any, i: number) => (
                  <motion.button key={bk.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setSelectedBookingId(bk.id)} className="w-full rounded-xl border border-border bg-card p-4 text-left cursor-pointer hover:bg-muted/20 active:bg-muted/30 transition-colors">
                    <div className="mb-1 flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1">{bk.topic || bk.topic_my || (lang === "my" ? "ခေါင်းစဉ်မရှိ" : "No topic")}</h3>
                      <div className="flex items-center gap-2">
                        {statusBadge(bk.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{bk.mentor?.display_name || "Mentor"} ↔ {bk.mentee?.display_name || "Mentee"}</span>
                      <span>{bk.scheduled_date} {bk.scheduled_time}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── POST REVIEW SHEET ─── */}
      <AnimatePresence>
        {selectedPost && !showRemoval && (
          <BottomSheet onClose={() => setSelectedPostId(null)}>
            <span className="mb-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{selectedPost.category || "general"}</span>
            <p className="mb-1 text-xs text-muted-foreground">by {selectedPost.author?.display_name || "User"} · {formatTime(selectedPost.created_at)}</p>
            <div className="my-4 rounded-xl bg-muted p-4">
              <p className="text-sm leading-relaxed text-foreground">{lang === "my" ? selectedPost.content_my : (selectedPost.content_en || selectedPost.content_my)}</p>
              {selectedPost.image_url && (
                <img src={selectedPost.image_url} alt="Post image" className="mt-3 w-full rounded-lg object-cover max-h-64" />
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setShowRemoval(true)}><XCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ဖယ်ရှား" : "Remove"}</Button>
              <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => approvePost.mutate(selectedPost.id)}><CheckCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အတည်ပြု" : "Approve"}</Button>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>

      {/* Post Removal Reason */}
      <AnimatePresence>
        {showRemoval && selectedPostId && (
          <CenterModal onClose={() => setShowRemoval(false)}>
            <h3 className="mb-3 text-base font-bold text-foreground">{lang === "my" ? "ဖယ်ရှားရသည့် အကြောင်းရင်း" : "Removal Reason"}</h3>
            <div className="mb-3 space-y-2">
              {removalReasons.map(r => (
                <button key={r.en} onClick={() => setRemovalReason(r.en)} className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${removalReason === r.en ? "border-primary bg-primary/5" : "border-border"}`}>
                  {lang === "my" ? r.my : r.en}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowRemoval(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
              <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => removePost.mutate(selectedPostId)} disabled={!removalReason}>{lang === "my" ? "ဖယ်ရှားရန်" : "Remove"}</Button>
            </div>
          </CenterModal>
        )}
      </AnimatePresence>

      {/* ─── JOB REVIEW SHEET ─── */}
      <AnimatePresence>
        {selectedJob && !showJobReject && (
          <BottomSheet onClose={() => { setSelectedJobId(null); setJobChecks(jobChecklist.map(() => false)); }}>
            <h3 className="mb-1 text-base font-bold text-foreground">{lang === "my" ? (selectedJob.title_my || selectedJob.title) : selectedJob.title}</h3>
            <p className="mb-1 text-xs text-muted-foreground">{selectedJob.company} · {selectedJob.location}</p>
            <div className="my-3 rounded-xl bg-muted p-3">
              <p className="text-xs leading-relaxed text-foreground line-clamp-6">{lang === "my" ? (selectedJob.description_my || selectedJob.description) : selectedJob.description}</p>
            </div>
            {selectedJob.salary_min && <p className="mb-3 text-xs text-muted-foreground">{lang === "my" ? "လစာ" : "Salary"}: {selectedJob.salary_min}–{selectedJob.salary_max} {selectedJob.currency}</p>}
            <div className="mb-4 space-y-2">
              {jobChecklist.map((item, idx) => (
                <label key={item.en} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input type="checkbox" checked={jobChecks[idx]} onChange={() => setJobChecks(c => c.map((v, i) => i === idx ? !v : v))} className="rounded border-border" />
                  {lang === "my" ? item.my : item.en}
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setShowJobReject(true)}><XCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ပယ်ချ" : "Reject"}</Button>
              <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => approveJob.mutate(selectedJob.id)} disabled={!jobChecks.every(Boolean)}><CheckCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အတည်ပြု" : "Approve"}</Button>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" className="mt-3 w-full rounded-xl" onClick={() => { setSelectedJobId(null); navigate(`/admin/edit-job/${selectedJob.id}`); }}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> {lang === "my" ? "ပြင်ဆင်ရန်" : "Edit Job"}
              </Button>
            )}
          </BottomSheet>
        )}
      </AnimatePresence>

      {/* Job Reject Modal */}
      <AnimatePresence>
        {showJobReject && selectedJobId && (
          <CenterModal onClose={() => setShowJobReject(false)}>
            <h3 className="mb-3 text-base font-bold text-foreground">{lang === "my" ? "ပယ်ချရသည့် အကြောင်းရင်း" : "Rejection Reason"}</h3>
            <Textarea value={jobRejectReason} onChange={e => setJobRejectReason(e.target.value)} placeholder={lang === "my" ? "အကြောင်းရင်း ရေးပါ..." : "Write reason..."} className="mb-3" rows={3} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowJobReject(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
              <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => rejectJob.mutate(selectedJobId)} disabled={!jobRejectReason}>{lang === "my" ? "ပယ်ချရန်" : "Reject"}</Button>
            </div>
          </CenterModal>
        )}
      </AnimatePresence>

      {/* ─── PAYMENT REVIEW SHEET ─── */}
      <AnimatePresence>
        {selectedPayment && (
          <BottomSheet onClose={() => { setSelectedPaymentId(null); setPaymentNote(""); }}>
            <h3 className="mb-1 text-base font-bold text-foreground">{selectedPayment.profile?.display_name || "User"}</h3>
            <p className="text-xs text-muted-foreground mb-1">{selectedPayment.profile?.email}</p>
            <div className="my-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted p-2"><span className="text-muted-foreground">{lang === "my" ? "ပမာဏ" : "Amount"}</span><p className="font-semibold text-foreground">{selectedPayment.amount} {selectedPayment.currency}</p></div>
              <div className="rounded-lg bg-muted p-2"><span className="text-muted-foreground">{lang === "my" ? "နည်းလမ်း" : "Method"}</span><p className="font-semibold text-foreground">{selectedPayment.payment_method}</p></div>
              <div className="rounded-lg bg-muted p-2"><span className="text-muted-foreground">{lang === "my" ? "အမျိုးအစား" : "Type"}</span><p className="font-semibold text-foreground">{selectedPayment.payment_type}</p></div>
              <div className="rounded-lg bg-muted p-2"><span className="text-muted-foreground">{lang === "my" ? "အခြေအနေ" : "Status"}</span><div className="mt-0.5">{statusBadge(selectedPayment.status)}</div></div>
            </div>
            {selectedPayment.proof_url && (
              <a href={selectedPayment.proof_url} target="_blank" rel="noopener noreferrer" className="mb-3 flex items-center gap-1.5 text-xs text-primary underline">
                <Eye className="h-3.5 w-3.5" /> {lang === "my" ? "ပြေစာ ကြည့်ရန်" : "View proof"}
              </a>
            )}
            {selectedPayment.admin_note && (
              <div className="mb-3 rounded-lg border border-border bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">{lang === "my" ? "မှတ်ချက်" : "Note"}</p>
                <p className="text-xs text-foreground">{selectedPayment.admin_note}</p>
              </div>
            )}

            {selectedPayment.status === "pending" && (
              <>
                <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder={lang === "my" ? "မှတ်ချက် ရေးပါ..." : "Add note..."} className="mb-3" rows={2} />
                {isAdmin ? (
                  <div className="flex gap-3">
                    <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => updatePayment.mutate({ id: selectedPayment.id, status: "rejected", admin_note: paymentNote })}><XCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ပယ်ချ" : "Reject"}</Button>
                    <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => updatePayment.mutate({ id: selectedPayment.id, status: "approved", admin_note: paymentNote })}><CheckCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အတည်ပြု" : "Approve"}</Button>
                  </div>
                ) : (
                  <Button variant="secondary" size="lg" className="w-full rounded-xl" onClick={() => recommendPayment.mutate({ id: selectedPayment.id, note: paymentNote })} disabled={!paymentNote}>
                    <Shield className="mr-1.5 h-4 w-4" /> {lang === "my" ? "Admin ထံ အကြံပြု" : "Recommend to Admin"}
                  </Button>
                )}
              </>
            )}
          </BottomSheet>
        )}
      </AnimatePresence>

      {/* ─── BOOKING DETAIL SHEET ─── */}
      <AnimatePresence>
        {selectedBooking && (
          <BottomSheet onClose={() => setSelectedBookingId(null)}>
            <h3 className="mb-1 text-base font-bold text-foreground">{selectedBooking.topic || selectedBooking.topic_my || (lang === "my" ? "ခေါင်းစဉ်မရှိ" : "No topic")}</h3>
            <div className="my-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">{lang === "my" ? "လမ်းညွှန်" : "Mentor"}</span><span className="font-medium text-foreground">{selectedBooking.mentor?.display_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{lang === "my" ? "သင်တန်းသား" : "Mentee"}</span><span className="font-medium text-foreground">{selectedBooking.mentee?.display_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{lang === "my" ? "ရက်စွဲ" : "Date"}</span><span className="font-medium text-foreground">{selectedBooking.scheduled_date} {selectedBooking.scheduled_time}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{lang === "my" ? "အခြေအနေ" : "Status"}</span>{statusBadge(selectedBooking.status)}</div>
              {selectedBooking.goals && <div><span className="text-muted-foreground">{lang === "my" ? "ရည်ရွယ်ချက်" : "Goals"}</span><p className="mt-1 text-foreground">{selectedBooking.goals}</p></div>}
              {selectedBooking.decline_reason && <div><span className="text-muted-foreground">{lang === "my" ? "ငြင်းပယ်ချက်" : "Decline reason"}</span><p className="mt-1 text-foreground">{selectedBooking.decline_reason}</p></div>}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">{lang === "my" ? "ကြည့်ရှုရန်သာ - ချိန်းဆိုမှုများကို mentor/mentee က စီမံသည်" : "View only — bookings are managed by mentor/mentee"}</p>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Shared UI Components ───

const Spinner = () => (
  <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center py-16 text-center">
    <CheckCircle className="mb-3 h-10 w-10 text-emerald-500" strokeWidth={1.5} />
    <p className="text-sm font-medium text-foreground">{label}</p>
  </div>
);

const BottomSheet = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={onClose}>
    <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
      {children}
    </motion.div>
  </motion.div>
);

const CenterModal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={onClose}>
    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
      {children}
    </motion.div>
  </motion.div>
);

export default ModeratorDashboard;
