import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Upload, FileCheck2, FileClock, FileWarning, Info } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import FinanceLedger from "@/components/finance/FinanceLedger";
import FinanceFilters, { applyFinanceFilters, type StatusFilter } from "@/components/finance/FinanceFilters";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { paymentTypeLabels, shortRef, formatMoney } from "@/lib/finance";
import { uploadPaymentProof } from "@/hooks/use-payment";

/** Visual proof status for a placement-fee row. */
function ProofStatusChip({ p, lang }: { p: any; lang: "my" | "en" }) {
  if (p.payment_type !== "placement_fee") return null;
  let Icon = FileWarning;
  let cls = "bg-destructive/10 text-destructive";
  let labelMy = "အထောက်အထား မရှိသေး";
  let labelEn = "No proof";
  if (p.status === "approved") {
    Icon = FileCheck2; cls = "bg-emerald/10 text-emerald";
    labelMy = "အတည်ပြုပြီး"; labelEn = "Approved";
  } else if (p.proof_url) {
    Icon = FileClock; cls = "bg-warning/10 text-warning";
    labelMy = "စစ်ဆေးနေသည်"; labelEn = "Under review";
  }
  return (
    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${cls}`}>
      <Icon className="h-2.5 w-2.5" strokeWidth={2} />
      {lang === "my" ? labelMy : labelEn}
    </span>
  );
}

const PAGE_SIZE = 20;

const EmployerFinance = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proofFor, setProofFor] = useState<any | null>(null);
  const [detailFor, setDetailFor] = useState<any | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [currency, setCurrency] = useState<string>("all");
  const [kpiFilter, setKpiFilter] = useState<"all" | "paid" | "due" | "placement" | "subs">("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setProofUrl(null);
    if (!detailFor?.proof_url) return;
    const path = detailFor.proof_url as string;
    if (/^https?:\/\//i.test(path)) {
      setProofUrl(path);
      return;
    }
    supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setProofUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [detailFor]);

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ["employer-finance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const all = payments || [];
  const placementInvoices = all.filter((p) => p.payment_type === "placement_fee");
  const subs = all.filter((p) => p.payment_type === "employer_subscription");
  const due = all.filter((p) => p.status === "pending");
  const paid = all.filter((p) => p.status === "approved");

  const kpiScoped = useMemo(() => {
    if (kpiFilter === "paid") return paid;
    if (kpiFilter === "due") return due;
    if (kpiFilter === "placement") return placementInvoices;
    if (kpiFilter === "subs") return subs;
    return all;
  }, [kpiFilter, all, paid, due, placementInvoices, subs]);

  const filtered = useMemo(() => applyFinanceFilters(kpiScoped, status, currency), [kpiScoped, status, currency]);
  const currencies = useMemo(() => all.map((p) => p.currency || "USD"), [all]);
  const totalFiltered = filtered.length;
  const pageStart = page * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, totalFiltered);
  const pagedFiltered = filtered.slice(pageStart, pageEnd);

  const handleUpload = async () => {
    if (!proofFor || !file || !user) return;
    setUploading(true);
    try {
      const path = await uploadPaymentProof(user.id, file);
      const { error } = await supabase
        .from("payment_requests")
        .update({ proof_url: path } as any)
        .eq("id", proofFor.id);
      if (error) throw error;
      setProofFor(null);
      setFile(null);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRowClick = (p: any) => {
    // Placement fees with no proof → open upload sheet directly
    if (p.payment_type === "placement_fee" && p.status === "pending" && !p.proof_url) {
      setProofFor(p);
      return;
    }
    setDetailFor(p);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ငွေကြေး မှတ်တမ်း" : "Employer Finances"} showBack />
      <div className="px-5">
        <FinanceLedger
          isLoading={isLoading}
          totals={[
            {
              label: { my: "ပေးချေပြီး", en: "Total Paid" },
              rows: paid.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
              tone: "border-emerald/30",
              onClick: () => setKpiFilter(kpiFilter === "paid" ? "all" : "paid"),
              active: kpiFilter === "paid",
            },
            {
              label: { my: "ပေးချေရန်", en: "Outstanding" },
              rows: due.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
              tone: "border-warning/30",
              onClick: () => setKpiFilter(kpiFilter === "due" ? "all" : "due"),
              active: kpiFilter === "due",
            },
            {
              label: { my: "ခန့်အပ်ခ စုစုပေါင်း", en: "Placement Fees" },
              rows: placementInvoices.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
              onClick: () => setKpiFilter(kpiFilter === "placement" ? "all" : "placement"),
              active: kpiFilter === "placement",
            },
            {
              label: { my: "အစီအစဉ် ကုန်ကျ", en: "Plan Spend" },
              rows: subs.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
              onClick: () => setKpiFilter(kpiFilter === "subs" ? "all" : "subs"),
              active: kpiFilter === "subs",
            },
          ]}
          rows={[]}
          emptyText={{ my: "", en: "" }}
        />
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center gap-1 font-medium underline decoration-dashed underline-offset-2">
                  {lang === "my" ? "ပေးချေရန် ဆိုသည်မှာ" : "Outstanding"}
                  <Info className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {lang === "my"
                  ? "အက်မင် ငွေပေးချေမှု အတည်ပြုရန် စောင့်ဆိုင်းနေသော ပမာဏများ"
                  : "Amounts awaiting admin payment approval"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <FinanceFilters
          status={status}
          onStatusChange={setStatus}
          currency={currency}
          onCurrencyChange={setCurrency}
          availableCurrencies={currencies}
        />

        <FinanceLedger
          isLoading={isLoading}
          totals={[]}
          rows={pagedFiltered.map((p) => ({
            id: p.id,
            title: lang === "my"
              ? paymentTypeLabels[p.payment_type]?.my || p.payment_type
              : paymentTypeLabels[p.payment_type]?.en || p.payment_type,
            subtitle: `${p.payment_method?.toUpperCase?.() || ""} · ${shortRef(p.id)}`,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status,
            date: p.created_at,
            trailing: <span><ProofStatusChip p={p} lang={lang} /></span>,
            onClick: () => handleRowClick(p),
          }))}
          emptyText={{ my: "ငွေကြေးမှတ်တမ်း မရှိသေးပါ", en: "No financial activity matches these filters" }}
        />
        {totalFiltered > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              {lang === "my" ? "နောက်သို့" : "Previous"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {lang === "my"
                ? `${pageStart + 1}–${pageEnd} / ${totalFiltered}`
                : `${pageStart + 1}–${pageEnd} of ${totalFiltered}`}
            </span>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage(p => p + 1)} disabled={pageEnd >= totalFiltered}>
              {lang === "my" ? "ရှေ့သို့" : "Next"}
            </Button>
          </div>
        )}
      </div>

      {/* Upload proof sheet */}
      <Sheet open={!!proofFor} onOpenChange={(v) => { if (!v) { setProofFor(null); setFile(null); } }}>
        <SheetContent side="bottom" className="bottom-16 max-h-[80vh] overflow-y-auto rounded-t-3xl pb-8">
          <SheetHeader>
            <SheetTitle className="text-base font-bold">
              {lang === "my" ? "ငွေပေးချေမှု အထောက်အထား တင်ရန်" : "Submit Payment Proof"}
            </SheetTitle>
          </SheetHeader>
          {proofFor && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[10px] text-muted-foreground">
                  {lang === "my" ? "ပမာဏ" : "Amount Due"}
                </p>
                <p className="text-base font-bold text-foreground">
                  {formatMoney(Number(proofFor.amount), proofFor.currency, lang)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {lang === "my" ? "ကိုးကားနံပါတ်" : "Reference"}: {shortRef(proofFor.id)}
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) {
                    if (f.size > 5 * 1024 * 1024) {
                      toast.error("File too large — maximum file size is 5MB.");
                      e.target.value = "";
                      return;
                    }
                    if (!f.type.startsWith("image/")) {
                      toast.error("Invalid file type — only image files are accepted.");
                      e.target.value = "";
                      return;
                    }
                  }
                  setFile(f);
                }}
                className="block w-full text-xs"
              />
              <Button
                disabled={!file || uploading}
                onClick={handleUpload}
                className="w-full rounded-xl"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading
                  ? (lang === "my" ? "တင်နေသည်..." : "Uploading...")
                  : (lang === "my" ? "အထောက်အထား တင်ရန်" : "Submit Proof")}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment detail sheet */}
      <Sheet open={!!detailFor} onOpenChange={(v) => { if (!v) setDetailFor(null); }}>
        <SheetContent side="bottom" className="bottom-16 max-h-[80vh] overflow-y-auto rounded-t-3xl pb-8">
          <SheetHeader>
            <SheetTitle className="text-base font-bold">
              {lang === "my" ? "ငွေပေးချေမှု အသေးစိတ်" : "Payment Details"}
            </SheetTitle>
          </SheetHeader>
          {detailFor && (
            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {lang === "my" ? "အမျိုးအစား" : "Type"}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {lang === "my"
                    ? paymentTypeLabels[detailFor.payment_type]?.my || detailFor.payment_type
                    : paymentTypeLabels[detailFor.payment_type]?.en || detailFor.payment_type}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {lang === "my" ? "ပမာဏ" : "Amount"}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {formatMoney(Number(detailFor.amount), detailFor.currency, lang)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {lang === "my" ? "အခြေအနေ" : "Status"}
                  </p>
                  <p className="text-sm font-semibold capitalize text-foreground">{detailFor.status}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {lang === "my" ? "ကိုးကားနံပါတ်" : "Reference"}
                </p>
                <p className="font-mono text-xs text-foreground">{shortRef(detailFor.id)}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {lang === "my" ? "ပေးချေနည်း" : "Method"}
                </p>
                <p className="text-xs font-medium uppercase text-foreground">{detailFor.payment_method || "—"}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {lang === "my" ? "ရက်စွဲ" : "Date"}
                </p>
                <p className="text-xs text-foreground">{new Date(detailFor.created_at).toLocaleString()}</p>
              </div>
              {detailFor.admin_note && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {lang === "my" ? "မှတ်ချက်" : "Note"}
                  </p>
                  <p className="text-xs text-foreground">{detailFor.admin_note}</p>
                </div>
              )}
              {detailFor.proof_url ? (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {lang === "my" ? "အထောက်အထား" : "Attachment"}
                  </p>
                  {proofUrl ? (
                    <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={proofUrl}
                        alt="Payment proof"
                        className="max-h-64 w-full rounded-md border border-border object-contain"
                      />
                      <p className="mt-2 text-[10px] text-primary underline">
                        {lang === "my" ? "အပြည့်အစုံ ဖွင့်ရန်" : "Open full size"}
                      </p>
                    </a>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      {lang === "my" ? "ဖွင့်နေသည်..." : "Loading attachment..."}
                    </p>
                  )}
                </div>
              ) : (
                detailFor.payment_type === "placement_fee" && detailFor.status === "pending" && (
                  <Button
                    onClick={() => { setProofFor(detailFor); setDetailFor(null); }}
                    className="w-full rounded-xl"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {lang === "my" ? "အထောက်အထား တင်ရန်" : "Submit Proof"}
                  </Button>
                )
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EmployerFinance;
