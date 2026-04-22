import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, MessageCircle, X, CheckCircle, Clock, Eye, XCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerApplications } from "@/hooks/use-jobs";
import { useUpdateApplicationStatus } from "@/hooks/use-employer-data";
import { useStartConversation } from "@/hooks/use-start-conversation";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const NEW_APPLICATION_STATUSES = ["applied", "submitted"];
const INTERVIEW_APPLICATION_STATUSES = ["interview", "interviewed"];

const statusConfig: Record<string, { label: { my: string; en: string }; color: string }> = {
  applied: { label: { my: "တင်ပြပြီး", en: "New" }, color: "text-primary bg-primary/10" },
  submitted: { label: { my: "တင်ပြပြီး", en: "New" }, color: "text-primary bg-primary/10" },
  viewed: { label: { my: "ကြည့်ပြီး", en: "Viewed" }, color: "text-accent bg-accent/10" },
  shortlisted: { label: { my: "ရွေးချယ်ပြီး", en: "Shortlisted" }, color: "text-emerald bg-emerald/10" },
  interview: { label: { my: "အင်တာဗျူး", en: "Interview" }, color: "text-primary bg-primary/10" },
  interviewed: { label: { my: "အင်တာဗျူး", en: "Interview" }, color: "text-primary bg-primary/10" },
  offered: { label: { my: "ကမ်းလှမ်းပြီး", en: "Offered" }, color: "text-emerald bg-emerald/10" },
  rejected: { label: { my: "ငြင်းပယ်ပြီး", en: "Rejected" }, color: "text-destructive bg-destructive/10" },
  placed: { label: { my: "ခန့်အပ်ပြီး", en: "Placed" }, color: "text-emerald bg-emerald/10" },
};

const statusFlow = ["applied", "viewed", "shortlisted", "interview", "offered", "placed"];
const rejectionReasons = [
  { my: "အတွေ့အကြုံ မလုံလောက်", en: "Not enough experience" },
  { my: "ကျွမ်းကျင်မှု မကိုက်ညီ", en: "Skills mismatch" },
  { my: "ရာထူး ပြည့်ပြီး", en: "Position filled" },
  { my: "အခြား", en: "Other" },
];

const EmployerApplications = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: applications, isLoading } = useEmployerApplications();
  const updateStatus = useUpdateApplicationStatus();
  const { startConversation } = useStartConversation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [showPlacement, setShowPlacement] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [placementSalary, setPlacementSalary] = useState("");
  const [filter, setFilter] = useState("all");

  const apps = applications || [];
  const filtered = apps.filter((a: any) => {
    if (filter === "all") return true;
    if (filter === "new") return NEW_APPLICATION_STATUSES.includes(a.status);
    if (filter === "interview") return INTERVIEW_APPLICATION_STATUSES.includes(a.status);
    return a.status === filter;
  });
  const selected = apps.find((a: any) => a.id === selectedId);
  const selectedStatus = selected
    ? INTERVIEW_APPLICATION_STATUSES.includes(selected.status)
      ? "interview"
      : selected.status === "submitted"
        ? "applied"
        : selected.status
    : null;

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast.success(lang === "my" ? "အခြေအနေ ပြောင်းပြီး" : "Status updated successfully");
      setSelectedId(null);
    } catch (err: any) {
      toast.error(lang === "my" ? "အခြေအနေ ပြောင်း၍ မရပါ" : "Failed to update status");
    }
  };

  const handleReject = async () => {
    if (selectedId) {
      try {
        await updateStatus.mutateAsync({ id: selectedId, status: "rejected", rejectionReason });
        toast.success(lang === "my" ? "ငြင်းပယ်ပြီး" : "Application rejected");
        setShowReject(false); setSelectedId(null); setRejectionReason("");
      } catch (err: any) {
        toast.error((lang === "my" ? "ငြင်းပယ်၍ မရပါ: " : "Failed to reject: ") + (err?.message || "unknown"));
      }
    }
  };

  const handlePlacement = async () => {
    if (!selectedId) return;
    const salary = parseInt(placementSalary, 10);
    if (!Number.isFinite(salary) || salary <= 0) {
      toast.error(lang === "my" ? "လစာ မှန်ကန်စွာ ထည့်ပါ" : "Enter a valid salary");
      return;
    }
    try {
      const fee = Math.round(salary * 0.08);
      await updateStatus.mutateAsync({ id: selectedId, status: "placed", placementSalary: salary, placementFee: fee });
      toast.success(lang === "my" ? "ခန့်အပ်မှု အတည်ပြုပြီး" : "Placement confirmed!");
      setShowPlacement(false); setSelectedId(null); setPlacementSalary("");
    } catch (err: any) {
      toast.error((lang === "my" ? "ခန့်အပ်မှု မအောင်မြင်ပါ: " : "Failed to confirm placement: ") + (err?.message || "unknown"));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လျှောက်ထားသူများ" : "Applications"} backPath="/employer/dashboard" />
      <div className="px-5">
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { label: lang === "my" ? "အားလုံး" : "Total", count: apps.length, color: "text-foreground", filterVal: "all" },
            { label: lang === "my" ? "အသစ်" : "New", count: apps.filter((a: any) => NEW_APPLICATION_STATUSES.includes(a.status)).length, color: "text-primary", filterVal: "new" },
            { label: lang === "my" ? "ရွေးချယ်" : "Shortlisted", count: apps.filter((a: any) => a.status === "shortlisted").length, color: "text-emerald", filterVal: "shortlisted" },
            { label: lang === "my" ? "ခန့်အပ်" : "Placed", count: apps.filter((a: any) => a.status === "placed").length, color: "text-emerald", filterVal: "placed" },
          ].map((s) => (
            <button key={s.label} onClick={() => setFilter(s.filterVal)} className={`rounded-xl border bg-card p-2.5 text-center transition-colors active:bg-muted/30 ${filter === s.filterVal ? "border-primary" : "border-border"}`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </button>
          ))}
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {["all", "new", "shortlisted", "interview", "offered", "placed", "rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {f === "all"
                ? (lang === "my" ? "အားလုံး" : "All")
                : f === "new"
                  ? (lang === "my" ? "အသစ်" : "New")
                  : (lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">{lang === "my" ? "ရှာဖွေနေပါသည်..." : "Loading..."}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
              <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "လျှောက်ထားသူ မရှိပါ" : "No applications yet"}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "လျှောက်ထားသူများ ရောက်လာသောအခါ ဤနေရာတွင် ပေါ်လာပါမည်" : "Applications will appear here once candidates apply"}</p>
            </div>
          ) : filtered.map((app: any, i: number) => {
            const sc = statusConfig[app.status] || statusConfig.applied;
            return (
              <motion.button key={app.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedId(app.id)}
                className="w-full rounded-xl border border-border bg-card p-4 text-left active:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {((app as any).applicant_profile?.display_name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{app.applicant_profile?.display_name || "Applicant"}</h3>
                        <p className="text-[11px] text-muted-foreground">{app.jobs?.title || "Job"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>{lang === "my" ? sc.label.my : sc.label.en}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && !showReject && !showPlacement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selected.applicant_profile?.display_name || "Applicant"}</h2>
                  <p className="text-xs text-muted-foreground">{selected.jobs?.title || "Application"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${(statusConfig[selected.status] || statusConfig.applied).color}`}>
                  {lang === "my" ? (statusConfig[selected.status] || statusConfig.applied).label.my : (statusConfig[selected.status] || statusConfig.applied).label.en}
                </span>
              </div>
              {selected.cover_letter && (
                <div className="mb-4 rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{lang === "my" ? "Cover Letter" : "Cover Letter"}</p>
                  <p className="mt-1 text-sm text-foreground">{selected.cover_letter}</p>
                </div>
              )}
              
              {/* Message applicant button */}
              <Button variant="outline" size="sm" className="mb-4 w-full rounded-xl" onClick={() => { setSelectedId(null); startConversation(selected.applicant_id); }}>
                <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                {lang === "my" ? "မက်ဆေ့ချ် ပို့ရန်" : "Message Applicant"}
              </Button>

              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အခြေအနေ ပြောင်းရန်" : "Update Status"}</p>
                <div className="flex flex-wrap gap-2">
                  {statusFlow.filter(s => s !== selectedStatus).map(s => (
                    <Button key={s} variant="outline" size="sm" className="rounded-lg text-xs"
                      onClick={() => { if (s === "placed") setShowPlacement(true); else handleStatusUpdate(selected.id, s); }}>
                      {lang === "my" ? statusConfig[s]?.label.my : statusConfig[s]?.label.en}
                    </Button>
                  ))}
                  {selected.status !== "rejected" && (
                    <Button variant="destructive" size="sm" className="rounded-lg text-xs" onClick={() => setShowReject(true)}>
                      {lang === "my" ? "ငြင်းပယ်" : "Reject"}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowReject(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-3 text-base font-bold text-foreground">{lang === "my" ? "ငြင်းပယ်ရသည့် အကြောင်းရင်း" : "Rejection Reason"}</h3>
              <div className="mb-3 space-y-2">
                {rejectionReasons.map(r => (
                  <button key={r.en} onClick={() => setRejectionReason(r.en)} className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${rejectionReason === r.en ? "border-primary bg-primary/5" : "border-border"}`}>
                    {lang === "my" ? r.my : r.en}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => { setShowReject(false); setRejectionReason(""); }}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" size="default" className="flex-1 rounded-xl" onClick={handleReject} disabled={!rejectionReason || updateStatus.isPending}>{lang === "my" ? "ငြင်းပယ်ရန်" : "Reject"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlacement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowPlacement(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-1 text-base font-bold text-foreground">{lang === "my" ? "ခန့်အပ်မှု အတည်ပြုရန်" : "Confirm Placement"}</h3>
              <p className="mb-4 text-xs text-muted-foreground">8% placement fee</p>
              <div className="mb-3">
                <label className="mb-1 block text-xs text-foreground">{lang === "my" ? "လစာ (USD/လ) *" : "Monthly Salary (USD) *"}</label>
                <input type="number" min="1" value={placementSalary} onChange={e => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 0) setPlacementSalary(val);
                }} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" placeholder="3000" />
              </div>
              {placementSalary && parseInt(placementSalary) > 0 && <p className="mb-4 text-xs text-muted-foreground">Fee: <span className="font-bold text-primary">${Math.round(parseInt(placementSalary) * 0.08)}</span></p>}
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => { setShowPlacement(false); setPlacementSalary(""); }}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="default" size="default" className="flex-1 rounded-xl" onClick={handlePlacement} disabled={!placementSalary || parseInt(placementSalary) <= 0 || updateStatus.isPending}>{lang === "my" ? "အတည်ပြုရန်" : "Confirm"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployerApplications;
