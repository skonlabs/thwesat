import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Building2, CheckCircle, XCircle, Clock, ExternalLink, Globe, Mail, Phone, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof Clock }> = {
  pending: { label: { my: "စစ်ဆေးဆဲ", en: "Pending" }, color: "bg-amber-500/10 text-amber-600", icon: Clock },
  verified: { label: { my: "အတည်ပြုပြီး", en: "Approved" }, color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle },
  approved: { label: { my: "အတည်ပြုပြီး", en: "Approved" }, color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle },
  rejected: { label: { my: "ပယ်ချပြီး", en: "Rejected" }, color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const AdminEmployers = () => {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: employers = [], isLoading } = useQuery({
    queryKey: ["admin-employers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (data || []).map((e) => e.id);
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_url, created_at")
        .in("id", ids);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return (data || []).map((emp) => ({
        ...emp,
        profile: profileMap.get(emp.id),
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const update: Record<string, unknown> = {
        verification_status: status,
        is_verified: status === "verified",
      };
      const { error } = await supabase.from("employer_profiles").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] });
      setSelectedId(null);
      setRejecting(false);
      setRejectReason("");
    },
  });

  const handleApprove = (id: string) => {
    updateStatus.mutate({ id, status: "verified" });
    toast.success(lang === "my" ? "အလုပ်ရှင် အတည်ပြုပြီး" : "Employer approved");
  };

  const handleReject = () => {
    if (!selectedId) return;
    updateStatus.mutate({ id: selectedId, status: "rejected", reason: rejectReason });
    toast.success(lang === "my" ? "အလုပ်ရှင် ပယ်ချပြီး" : "Employer rejected");
  };

  const filtered = employers.filter((e: any) => {
    const status = e.verification_status || "pending";
    const matchesTab = tab === "all" 
      || (tab === "approved" && (status === "verified" || status === "approved"))
      || (tab !== "approved" && status === tab);
    const q = search.toLowerCase();
    const matchesSearch = !q || (e.company_name || "").toLowerCase().includes(q) || (e.profile?.display_name || "").toLowerCase().includes(q) || (e.profile?.email || "").toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const selected = employers.find((e: any) => e.id === selectedId);
  const pendingCount = employers.filter((e: any) => (e.verification_status || "pending") === "pending").length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် စီမံခန့်ခွဲ" : "Employer Management"} />
      <div className="px-5">
        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 text-xs">
              {lang === "my" ? "စစ်ဆေးရန်" : "Pending"} {pendingCount > 0 && `(${pendingCount})`}
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1 text-xs">{lang === "my" ? "အတည်ပြုပြီး" : "Approved"}</TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1 text-xs">{lang === "my" ? "ပယ်ချပြီး" : "Rejected"}</TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-xs">{lang === "my" ? "အားလုံး" : "All"}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === "my" ? "ကုမ္ပဏီ သို့ အီးမေးလ်ဖြင့် ရှာ..." : "Search company or email..."} className="h-10 rounded-xl pl-9" />
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{filtered.length} {lang === "my" ? "ခု" : "employers"}</p>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">{lang === "my" ? "ရလဒ် မရှိပါ" : "No employers found"}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((emp: any, i: number) => {
              const st = statusConfig[(emp.verification_status || "pending")] || statusConfig.pending;
              return (
                <motion.button key={emp.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedId(emp.id)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left active:bg-muted/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{emp.company_name || "Unnamed Company"}</h3>
                    <p className="truncate text-[10px] text-muted-foreground">{emp.profile?.display_name} · {emp.industry || "—"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                    {lang === "my" ? st.label.my : st.label.en}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <AnimatePresence>
        {selected && !rejecting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-8 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selected.company_name || "Unnamed"}</h2>
                  <p className="text-xs text-muted-foreground">{selected.profile?.email}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${(statusConfig[(selected.verification_status || "pending")] || statusConfig.pending).color}`}>
                    {lang === "my" ? (statusConfig[(selected.verification_status || "pending")] || statusConfig.pending).label.my : (statusConfig[(selected.verification_status || "pending")] || statusConfig.pending).label.en}
                  </span>
                </div>
              </div>

              <div className="mb-4 space-y-2 text-xs text-muted-foreground">
                {selected.industry && <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />{lang === "my" ? "လုပ်ငန်း" : "Industry"}: {selected.industry}</p>}
                {selected.hq_country && <p className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />{lang === "my" ? "နိုင်ငံ" : "HQ"}: {selected.hq_country}</p>}
                {selected.company_size && <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{lang === "my" ? "အရွယ်အစား" : "Size"}: {selected.company_size}</p>}
                {selected.contact_name && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{lang === "my" ? "ဆက်သွယ်ရန်" : "Contact"}: {selected.contact_name}</p>}
                {selected.contact_email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{selected.contact_email}</p>}
                {selected.contact_phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{selected.contact_phone}</p>}
                {selected.company_website && (
                  <a href={selected.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary">
                    <ExternalLink className="h-3.5 w-3.5" />{selected.company_website}
                  </a>
                )}
                {selected.company_linkedin && (
                  <a href={selected.company_linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary">
                    <ExternalLink className="h-3.5 w-3.5" />LinkedIn
                  </a>
                )}
              </div>

              {selected.company_description && (
                <div className="mb-4">
                  <h3 className="mb-1 text-xs font-semibold text-foreground">{lang === "my" ? "ဖော်ပြချက်" : "Description"}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selected.company_description}</p>
                </div>
              )}

              <p className="mb-4 text-[10px] text-muted-foreground">{lang === "my" ? "စတင်ရက်" : "Joined"}: {new Date(selected.profile?.created_at || selected.created_at).toLocaleDateString()}</p>

              {(selected.verification_status || "pending") === "pending" && (
                <div className="flex gap-3">
                  <Button onClick={() => handleApprove(selected.id)} className="flex-1 rounded-xl" size="sm">
                    <CheckCircle className="mr-1.5 h-4 w-4" />{lang === "my" ? "အတည်ပြု" : "Approve"}
                  </Button>
                  <Button variant="outline" onClick={() => setRejecting(true)} className="flex-1 rounded-xl border-destructive text-destructive" size="sm">
                    <XCircle className="mr-1.5 h-4 w-4" />{lang === "my" ? "ပယ်ချ" : "Reject"}
                  </Button>
                </div>
              )}

              {(selected.verification_status || "pending") === "rejected" && (
                <Button onClick={() => handleApprove(selected.id)} className="w-full rounded-xl" size="sm">
                  <CheckCircle className="mr-1.5 h-4 w-4" />{lang === "my" ? "ပြန်အတည်ပြု" : "Re-approve"}
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejecting && selectedId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setRejecting(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "ပယ်ချရန် အကြောင်းပြ" : "Rejection Reason"}</h3>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={lang === "my" ? "အကြောင်းပြချက် ရေးပါ..." : "Enter reason..."} className="mb-4 rounded-xl" rows={3} />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setRejecting(false)} className="flex-1 rounded-xl" size="sm">{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" onClick={handleReject} className="flex-1 rounded-xl" size="sm" disabled={updateStatus.isPending}>{lang === "my" ? "ပယ်ချ" : "Reject"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEmployers;
