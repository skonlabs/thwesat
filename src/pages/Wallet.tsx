import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon, Plus, ArrowDownRight, ArrowUpRight, RefreshCw, Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useWallet, useCreditPackages, useWalletTransactions, useMyTopupRequests, formatMMK, formatCredits, type CreditPackage } from "@/hooks/use-wallet";
import TopupSheet from "@/components/wallet/TopupSheet";

const Wallet = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { data: wallet, isLoading } = useWallet();
  const { data: packages = [] } = useCreditPackages();
  const { data: txs = [] } = useWalletTransactions(50);
  const { data: topups = [] } = useMyTopupRequests();
  const [topupOpen, setTopupOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);

  const pendingTopups = useMemo(() => topups.filter((t) => t.status === "pending"), [topups]);

  const balance = wallet?.balance_credits ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပိုက်ဆံအိတ်" : "Wallet"} />
      <div className="px-5 space-y-5">
        {/* Balance card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-2 text-xs opacity-80">
            <WalletIcon className="h-4 w-4" />
            <span>{lang === "my" ? "လက်ကျန် Credits" : "Credit balance"}</span>
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums">
            {isLoading ? "—" : balance.toLocaleString()}
          </div>
          <div className="mt-1 text-xs opacity-75">
            {lang === "my" ? "1 Credit = 1 ကျပ်" : "1 credit = 1 Ks"}
          </div>
          <button
            onClick={() => { setSelectedPkg(null); setTopupOpen(true); }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow active:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {lang === "my" ? "ငွေဖြည့်မည်" : "Top up wallet"}
          </button>
        </div>

        {pendingTopups.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            <div className="flex items-center gap-1.5 font-semibold">
              <Clock className="h-3.5 w-3.5" />
              {lang === "my"
                ? `${pendingTopups.length} ခု စစ်ဆေးနေသည်`
                : `${pendingTopups.length} top-up${pendingTopups.length > 1 ? "s" : ""} pending review`}
            </div>
            <div className="mt-1 opacity-80">
              {lang === "my" ? "Admin အတည်ပြုပြီးမှ Credit ထည့်ပေးမည်။" : "Credits will appear after admin approval (usually within hours)."}
            </div>
          </div>
        )}

        {/* Packages */}
        <section>
          <h2 className="mb-2 text-sm font-bold">{lang === "my" ? "ငွေဖြည့် Package" : "Top-up packages"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {packages.map((p) => {
              const total = p.credits + p.bonus_credits;
              const badge = lang === "my" ? p.badge_my : p.badge_en;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPkg(p); setTopupOpen(true); }}
                  className="relative rounded-xl border border-border bg-card p-3 text-left transition active:scale-[0.98]"
                >
                  {badge && (
                    <span className="absolute -top-1.5 right-2 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">
                      {badge}
                    </span>
                  )}
                  <div className="text-xs font-semibold text-muted-foreground">{lang === "my" ? p.name_my : p.name_en}</div>
                  <div className="mt-1 text-base font-bold">{total.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">credits</span></div>
                  {p.bonus_credits > 0 && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">+{p.bonus_credits.toLocaleString()} bonus</div>
                  )}
                  <div className="mt-1 text-xs text-primary">{formatMMK(p.price_mmk, lang)}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Transactions */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">{lang === "my" ? "မှတ်တမ်း" : "Recent activity"}</h2>
            <button onClick={() => navigate("/payments/history")} className="text-xs text-primary">{lang === "my" ? "အားလုံး" : "View all"}</button>
          </div>
          {txs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {lang === "my" ? "မှတ်တမ်း မရှိသေးပါ" : "No transactions yet"}
            </div>
          ) : (
            <div className="space-y-1.5">
              {txs.slice(0, 20).map((t) => {
                const positive = t.credits > 0;
                const Icon = t.kind === "topup" ? Plus : t.kind === "refund" ? RefreshCw : t.kind === "earning" ? Sparkles : positive ? ArrowUpRight : ArrowDownRight;
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{txLabel(t, lang)}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className={`text-xs font-bold tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                      {positive ? "+" : ""}{t.credits.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {topups.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-bold">{lang === "my" ? "ငွေဖြည့်မှု မှတ်တမ်း" : "Top-up history"}</h2>
            <div className="space-y-1.5">
              {topups.slice(0, 10).map((t) => {
                const StatusIcon = t.status === "approved" ? CheckCircle2 : t.status === "rejected" ? XCircle : Clock;
                const tone = t.status === "approved" ? "text-emerald-600" : t.status === "rejected" ? "text-destructive" : "text-amber-600";
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
                    <div>
                      <div className="font-semibold">{formatMMK(t.mmk_amount, lang)} → {t.credits_to_grant.toLocaleString()} credits</div>
                      <div className="text-[10px] text-muted-foreground">{t.payment_method.toUpperCase()} · {new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className={`flex items-center gap-1 ${tone}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      <span className="capitalize">{t.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <TopupSheet open={topupOpen} onOpenChange={setTopupOpen} initialPackage={selectedPkg ?? undefined} packages={packages} />
    </div>
  );
};

function txLabel(t: { kind: string; ref_type: string | null; ref_id: string | null; note: string | null }, lang: "my" | "en") {
  if (t.note) return t.note;
  const map: Record<string, { my: string; en: string }> = {
    topup: { my: "ငွေဖြည့်မှု", en: "Top-up" },
    spend: { my: "သုံးစွဲမှု", en: "Spend" },
    earning: { my: "ဝင်ငွေ", en: "Earning" },
    escrow_hold: { my: "Booking ထိန်းသိမ်း", en: "Booking hold" },
    escrow_release: { my: "ပြန်ထုတ်", en: "Released" },
    refund: { my: "ပြန်အမ်း", en: "Refund" },
    adjustment: { my: "ပြုပြင်မှု", en: "Adjustment" },
    migration: { my: "ပြောင်းရွှေ့မှု credit", en: "Migration credit" },
    payout: { my: "Payout", en: "Payout" },
  };
  return (map[t.kind] && (lang === "my" ? map[t.kind].my : map[t.kind].en)) || t.kind;
}

export default Wallet;
