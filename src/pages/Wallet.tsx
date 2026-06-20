import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { useWallet, useWalletTransactions, useMyTopupRequests, useCreditPackages, formatMMK } from "@/hooks/use-wallet";
import TopupSheet from "@/components/wallet/TopupSheet";

const statusStyle = (status: string) => {
  if (status === "approved" || status === "completed" || status === "success") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected" || status === "failed") return "bg-destructive/10 text-destructive";
  return "bg-amber-100 text-amber-700";
};

const Wallet = () => {
  const { lang } = useLanguage();
  const my = lang === "my";
  const navigate = useNavigate();
  const { data: wallet, isLoading: loadingWallet } = useWallet();
  const { data: txs = [], isLoading: loadingTxs } = useWalletTransactions(50);
  const { data: topups = [], isLoading: loadingTopups } = useMyTopupRequests();
  const { data: packages = [] } = useCreditPackages();
  const [topupOpen, setTopupOpen] = useState(false);

  const balance = wallet?.balance_credits ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={my ? "ပိုက်ဆံအိတ်" : "Wallet"} />
      <div className="mx-auto w-full max-w-3xl space-y-5 px-5">
        {/* Balance card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-2 text-xs opacity-80">
            <WalletIcon className="h-4 w-4" />
            <span>{my ? "လက်ရှိ လက်ကျန်" : "Current balance"}</span>
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums">
            {loadingWallet ? "…" : formatMMK(balance, lang)}
          </div>
          <div className="mt-1 text-[11px] opacity-75">
            {my
              ? "Mentor session ချိန်းဆိုခြင်း၊ Career Tracks အသုံးပြုခြင်းတို့အတွက် သုံးနိုင်ပါသည်။"
              : "Use your balance for mentor bookings and career tracks."}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => setTopupOpen(true)}
              className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {my ? "ငွေဖြည့်ရန်" : "Top up"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/mentors")}
              className="flex-1 rounded-xl border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
            >
              {my ? "Mentor ရှာရန်" : "Find mentor"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">{my ? "သုံးစွဲမှု" : "Transactions"}</TabsTrigger>
            <TabsTrigger value="topups">{my ? "ငွေဖြည့်မှု" : "Top-ups"}</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-2 pt-3">
            {loadingTxs && <div className="py-6 text-center text-xs text-muted-foreground">…</div>}
            {!loadingTxs && txs.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                {my ? "သုံးစွဲမှု မှတ်တမ်း မရှိသေးပါ" : "No transactions yet"}
              </div>
            )}
            {txs.map((t) => {
              const isCredit = t.credits > 0;
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCredit ? "bg-emerald-100 text-emerald-700" : "bg-muted text-foreground"}`}>
                      {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">
                        {t.note || t.kind?.replace(/_/g, " ") || "Transaction"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()} · <span className="capitalize">{t.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`shrink-0 text-right text-sm font-bold tabular-nums ${isCredit ? "text-emerald-700" : "text-foreground"}`}>
                    {isCredit ? "+" : ""}{formatMMK(t.credits, lang)}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="topups" className="space-y-2 pt-3">
            {loadingTopups && <div className="py-6 text-center text-xs text-muted-foreground">…</div>}
            {!loadingTopups && topups.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                {my ? "ငွေဖြည့်မှု မှတ်တမ်း မရှိသေးပါ" : "No top-up requests yet"}
              </div>
            )}
            {topups.map((r) => {
              const Icon = r.status === "approved" ? CheckCircle2 : r.status === "rejected" ? XCircle : Clock;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">{formatMMK(r.mmk_amount, lang)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.payment_method?.toUpperCase()} · ref: {r.sender_reference || "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyle(r.status)}`}>
                      <Icon className="h-3 w-3" />
                      {r.status}
                    </span>
                  </div>
                  {r.admin_note && (
                    <div className="mt-2 rounded-md bg-muted/60 p-2 text-[10px] text-muted-foreground">
                      <span className="font-semibold">{my ? "Admin မှတ်ချက်" : "Admin note"}:</span> {r.admin_note}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      <TopupSheet open={topupOpen} onOpenChange={setTopupOpen} packages={packages} />
    </div>
  );
};

export default Wallet;
