import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Download, Star, MessageCircle, X, CheckCircle, Clock, Eye, XCircle, Mail, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const mockApplicants = [
  { id: 1, name: "Maung Maung", nameMy: "မောင်မောင်", headline: "Full Stack Developer", skills: ["React", "Node.js", "TypeScript"], experience: 4, status: "submitted", date: "Mar 25", avatar: "MM" },
  { id: 2, name: "Thiri Win", nameMy: "သီရိဝင်း", headline: "Frontend Developer", skills: ["React", "Vue", "CSS"], experience: 3, status: "viewed", date: "Mar 24", avatar: "TW" },
  { id: 3, name: "Aung Kyaw", nameMy: "အောင်ကျော်", headline: "Senior Developer", skills: ["React", "Python", "AWS"], experience: 6, status: "shortlisted", date: "Mar 22", avatar: "AK" },
  { id: 4, name: "Hnin Si", nameMy: "နှင်းဆီ", headline: "Junior Developer", skills: ["React", "JavaScript"], experience: 1, status: "rejected", date: "Mar 20", avatar: "HS" },
];

const statusConfig: Record<string, { label: { my: string; en: string }; color: string }> = {
  submitted: { label: { my: "တင်ပြပြီး", en: "New" }, color: "text-primary bg-primary/10" },
  viewed: { label: { my: "ကြည့်ပြီး", en: "Viewed" }, color: "text-accent bg-accent/10" },
  shortlisted: { label: { my: "ရွေးချယ်ပြီး", en: "Shortlisted" }, color: "text-emerald bg-emerald/10" },
  interviewed: { label: { my: "အင်တာဗျူး", en: "Interviewed" }, color: "text-primary bg-primary/10" },
  offered: { label: { my: "ကမ်းလှမ်းပြီး", en: "Offered" }, color: "text-emerald bg-emerald/10" },
  rejected: { label: { my: "ငြင်းပယ်ပြီး", en: "Rejected" }, color: "text-destructive bg-destructive/10" },
  placed: { label: { my: "ခန့်အပ်ပြီး", en: "Placed" }, color: "text-emerald bg-emerald/10" },
};

const statusFlow = ["submitted", "viewed", "shortlisted", "interviewed", "offered", "placed"];
const rejectionReasons = [
  { my: "အတွေ့အကြုံ မလုံလောက်", en: "Not enough experience" },
  { my: "ကျွမ်းကျင်မှု မကိုက်ညီ", en: "Skills mismatch" },
  { my: "ရာထူး ပြည့်ပြီး", en: "Position filled" },
  { my: "အခြား", en: "Other" },
];

const EmployerApplications = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [showPlacement, setShowPlacement] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [forwardEmail, setForwardEmail] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [placementSalary, setPlacementSalary] = useState("");
  const [applicants, setApplicants] = useState(mockApplicants);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? applicants : applicants.filter(a => a.status === filter);
  const selected = applicants.find(a => a.id === selectedId);

  const updateStatus = (id: number, newStatus: string) => {
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    toast({
      title: lang === "my" ? "အခြေအနေ ပြောင်းပြီးပါပြီ" : "Status updated",
      description: lang === "my" ? statusConfig[newStatus]?.label.my : statusConfig[newStatus]?.label.en,
    });
  };

  const handleReject = () => {
    if (selectedId) {
      updateStatus(selectedId, "rejected");
      setShowReject(false);
      setSelectedId(null);
    }
  };

  const handlePlacement = () => {
    if (selectedId && placementSalary) {
      updateStatus(selectedId, "placed");
      const fee = Math.round(parseInt(placementSalary) * 0.08);
      toast({
        title: lang === "my" ? "ခန့်အပ်မှု အတည်ပြုပြီး" : "Placement confirmed",
        description: `${lang === "my" ? "ခန့်အပ်ကြေး" : "Placement fee"}: $${fee}`,
      });
      setShowPlacement(false);
      setSelectedId(null);
    }
  };

  const handleForward = () => {
    if (forwardEmail && selected) {
      toast({
        title: lang === "my" ? "အီးမေးလ်သို့ ပို့ပြီးပါပြီ" : "Forwarded to email",
        description: lang === "my" ? `${selected.name} ၏ CV နှင့် Cover Letter ကို ${forwardEmail} သို့ ပို့ပြီးပါပြီ` : `${selected.name}'s CV & Cover Letter sent to ${forwardEmail}`,
      });
      setShowForward(false);
      setForwardEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "လျှောက်ထားသူများ" : "Applications"} />
      <div className="px-5">
        <div className="mb-3 rounded-xl border border-border bg-card p-3">
          <h2 className="text-sm font-bold text-foreground">Senior React Developer</h2>
          <p className="text-[10px] text-muted-foreground">{applicants.length} {lang === "my" ? "ဦး လျှောက်ထားပြီး" : "applicants"}</p>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {["all", "submitted", "shortlisted", "interviewed", "placed", "rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((app, i) => {
            const sc = statusConfig[app.status];
            return (
              <motion.button
                key={app.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedId(app.id)}
                className="w-full rounded-xl border border-border bg-card p-4 text-left active:bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{app.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? app.nameMy : app.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{app.headline} · {app.experience} {lang === "my" ? "နှစ်" : "yrs"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>{lang === "my" ? sc.label.my : sc.label.en}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {app.skills.map(s => (
                        <span key={s} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Applicant Detail Sheet */}
      <AnimatePresence>
        {selected && !showReject && !showPlacement && !showForward && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{selected.avatar}</div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{lang === "my" ? selected.nameMy : selected.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.headline}</p>
                  <p className="text-xs text-muted-foreground">{selected.experience} {lang === "my" ? "နှစ် အတွေ့အကြုံ" : "years experience"}</p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {selected.skills.map(s => (
                  <span key={s} className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{s}</span>
                ))}
              </div>
              <div className="mb-4 rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">{lang === "my" ? "Cover Note" : "Cover Note"}</p>
                <p className="mt-1 text-sm text-foreground">{lang === "my" ? "ဤအလုပ်အတွက် ကျွန်ုပ် အလွန်စိတ်ဝင်စားပါသည်..." : "I'm very excited about this opportunity..."}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-lg"><Download className="mr-1 h-3.5 w-3.5" /> CV</Button>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setSelectedId(null); navigate("/messages/chat"); }}><MessageCircle className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}</Button>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setShowForward(true)}>
                  <Mail className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "Email ပို့" : "Forward"}
                </Button>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အခြေအနေ ပြောင်းရန်" : "Update Status"}</p>
                <div className="flex flex-wrap gap-2">
                  {statusFlow.filter(s => s !== selected.status).map(s => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => {
                        if (s === "placed") { setShowPlacement(true); }
                        else { updateStatus(selected.id, s); setSelectedId(null); }
                      }}
                    >
                      {lang === "my" ? statusConfig[s]?.label.my : statusConfig[s]?.label.en}
                    </Button>
                  ))}
                  <Button variant="destructive" size="sm" className="rounded-lg text-xs" onClick={() => setShowReject(true)}>
                    {lang === "my" ? "ငြင်းပယ်" : "Reject"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward to Email Modal */}
      <AnimatePresence>
        {showForward && selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowForward(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-1 text-base font-bold text-foreground">{lang === "my" ? "Email သို့ ပေးပို့ရန်" : "Forward to Email"}</h3>
              <p className="mb-4 text-xs text-muted-foreground">
                {lang === "my" ? `${selected.name} ၏ CV နှင့် Cover Letter ကို email သို့ ပို့ပါ` : `Send ${selected.name}'s CV & Cover Letter to your email`}
              </p>
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "Email လိပ်စာ *" : "Email Address *"}</label>
                <Input
                  type="email"
                  value={forwardEmail}
                  onChange={e => setForwardEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => setShowForward(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="default" size="default" className="flex-1 rounded-xl" onClick={handleForward} disabled={!forwardEmail}>
                  <Send className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ပို့ရန်" : "Send"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
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
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => setShowReject(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" size="default" className="flex-1 rounded-xl" onClick={handleReject} disabled={!rejectionReason}>{lang === "my" ? "ငြင်းပယ်ရန်" : "Reject"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placement Confirm Modal */}
      <AnimatePresence>
        {showPlacement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowPlacement(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-1 text-base font-bold text-foreground">{lang === "my" ? "ခန့်အပ်မှု အတည်ပြုရန်" : "Confirm Placement"}</h3>
              <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "ပထမလစာ၏ ၈% ခန့်အပ်ကြေး ပေးရပါမည်" : "8% placement fee on first month's salary"}</p>
              <div className="mb-3">
                <label className="mb-1 block text-xs text-foreground">{lang === "my" ? "လစာ (USD/လ) *" : "Monthly Salary (USD) *"}</label>
                <input type="number" value={placementSalary} onChange={e => setPlacementSalary(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" placeholder="3000" />
              </div>
              {placementSalary && (
                <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "ခန့်အပ်ကြေး" : "Placement fee"}: <span className="font-bold text-primary">${Math.round(parseInt(placementSalary) * 0.08)}</span></p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => setShowPlacement(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="default" size="default" className="flex-1 rounded-xl" onClick={handlePlacement} disabled={!placementSalary}>{lang === "my" ? "အတည်ပြုရန်" : "Confirm"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployerApplications;
