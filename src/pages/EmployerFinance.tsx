import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import FinanceLedger from "@/components/finance/FinanceLedger";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { paymentTypeLabels, shortRef, formatMoney } from "@/lib/finance";
import { uploadPaymentProof } from "@/hooks/use-payment";

const EmployerFinance = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proofFor, setProofFor] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
            },
            {
              label: { my: "ပေးချေရန်", en: "Outstanding" },
              rows: due.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
              tone: "border-warning/30",
            },
            {
              label: { my: "ခန့်အပ်ခ စုစုပေါင်း", en: "Placement Fees" },
              rows: placementInvoices.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
            },
            {
              label: { my: "အစီအစဉ် ကုန်ကျ", en: "Plan Spend" },
              rows: subs.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
            },
          ]}
          rows={all.map((p) => ({
            id: p.id,
            title: lang === "my"
              ? paymentTypeLabels[p.payment_type]?.my || p.payment_type
              : paymentTypeLabels[p.payment_type]?.en || p.payment_type,
            subtitle: `${p.payment_method?.toUpperCase?.() || ""} · ${shortRef(p.id)}`,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status,
            date: p.created_at,
            onClick: () => {
              if (p.payment_type === "placement_fee" && p.status === "pending" && !p.proof_url) {
                setProofFor(p);
              }
            },
          }))}
          emptyText={{ my: "ငွေကြေးမှတ်တမ်း မရှိသေးပါ", en: "No financial activity yet" }}
        />
      </div>

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
                onChange={(e) => setFile(e.target.files?.[0] || null)}
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
    </div>
  );
};

export default EmployerFinance;
