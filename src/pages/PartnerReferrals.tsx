import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Plus, Tag, Lock, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

/**
 * Partner Referrals — generate immutable, one-time-use codes used during
 * Employer / Agent / Job Seeker signup. Each redeemed code attributes the
 * new user (and all their future revenue) to the originating partner.
 */
const PartnerReferrals = ({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const my = lang === "my";
  const [copied, setCopied] = useState<string | null>(null);

  const { data: partnerId } = useQuery({
    queryKey: ["current-partner-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("current_partner_id" as any);
      return (data as string | null) ?? null;
    },
  });

  const { data: codes, isLoading } = useQuery({
    queryKey: ["partner-referral-codes", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_referral_codes" as any)
        .select("id, code, status, used_by, used_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const mint = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("mint_partner_referral_codes" as any, { _count: 10 });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-referral-codes", partnerId] });
    },
    onError: (e: any) => {
      toast({
        title: my ? "ကုဒ်ထုတ်လုပ်၍ မရပါ" : "Could not generate codes",
        description: e?.message ?? "",
        variant: "destructive",
      });
    },
  });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    } catch {}
  };

  const unused = codes?.filter((c) => c.status === "unused") ?? [];
  const used = codes?.filter((c) => c.status === "used") ?? [];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <PageHeader title={my ? "ညွှန်းဆိုကုဒ်များ" : "Referral Codes"} />
      <div className="mx-auto max-w-4xl px-5 md:px-8 md:pt-2">
        {/* Intro */}
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-bold text-foreground">
            {my ? "Partner ညွှန်းဆိုကုဒ်များ" : "Partner referral codes"}
          </h2>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {my
              ? "ကုဒ်တစ်ခုစီသည် တစ်ကြိမ်တည်းသာ အသုံးပြုနိုင်ပြီး ထုတ်လုပ်ပြီးပါက ပြန်ဖျက်၍ မရပါ။ Employer, Agent သို့မဟုတ် Job Seeker အကောင့်ဖွင့်ရာတွင် အသုံးပြုပါ။ ထိုသူ၏ ဝင်ငွေသည် သင်နှင့် ချိတ်ဆက်ပါမည်။"
              : "Each code is single-use and cannot be deleted once generated. Use them when an employer, agent, or job seeker signs up — their future revenue is attributed to you."}
          </p>
        </div>

        {!partnerId && !isLoading && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-[12px]">
              {my
                ? "သင့်အကောင့်ကို partner record နှင့် ချိတ်ဆက်ထားခြင်း မရှိသေးပါ။ Admin ထံ ဆက်သွယ်ပါ။"
                : "Your account is not linked to a partner record yet. Contact admin to link it."}
            </p>
          </div>
        )}

        {/* Snapshot */}
        <div className="mb-5 grid grid-cols-3 gap-2.5">
          <Stat value={codes?.length ?? 0} label={my ? "စုစုပေါင်း" : "Total"} />
          <Stat value={unused.length} label={my ? "မသုံးရသေး" : "Unused"} tone="primary" />
          <Stat value={used.length} label={my ? "သုံးပြီး" : "Used"} tone="muted" />
        </div>

        {/* Generate */}
        <Button
          onClick={() => mint.mutate()}
          disabled={!partnerId || mint.isPending}
          className="mb-6 w-full md:w-auto"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {mint.isPending
            ? my ? "ထုတ်လုပ်နေသည်..." : "Generating..."
            : my ? "ကုဒ် ၁၀ ခု ထုတ်လုပ်ရန်" : "Generate 10 codes"}
        </Button>

        {/* Unused */}
        <h3 className="mb-2 text-sm font-bold text-foreground">
          {my ? "မသုံးရသေးသော ကုဒ်များ" : "Unused codes"}
        </h3>
        {isLoading ? (
          <p className="text-[12px] text-muted-foreground">{my ? "ဖွင့်နေသည်..." : "Loading..."}</p>
        ) : unused.length === 0 ? (
          <p className="mb-6 rounded-xl border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
            {my ? "ကုဒ် မရှိသေးပါ။ အပေါ်က ခလုတ်ဖြင့် ထုတ်လုပ်ပါ။" : "No codes yet. Generate some with the button above."}
          </p>
        ) : (
          <div className="mb-6 grid gap-2">
            {unused.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Tag className="h-4 w-4 text-primary" />
                <code className="flex-1 font-mono text-sm font-semibold tracking-wider text-foreground">{c.code}</code>
                <button
                  onClick={() => copyCode(c.code)}
                  className="flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/70"
                >
                  {copied === c.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === c.code ? (my ? "ကူးပြီး" : "Copied") : (my ? "ကူး" : "Copy")}
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Used */}
        {used.length > 0 && (
          <>
            <h3 className="mb-2 text-sm font-bold text-foreground">
              {my ? "သုံးပြီးကုဒ်များ" : "Used codes"}
            </h3>
            <div className="grid gap-2">
              {used.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <code className="flex-1 font-mono text-sm tracking-wider text-muted-foreground line-through">{c.code}</code>
                  <span className="text-[11px] text-muted-foreground">
                    {c.used_at ? new Date(c.used_at).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Stat = ({ value, label, tone = "default" }: { value: number; label: string; tone?: "default" | "primary" | "muted" }) => {
  const accent =
    tone === "primary" ? "text-primary" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className={`text-lg font-bold ${accent}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
};

export default PartnerReferrals;
