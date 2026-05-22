import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/hooks/use-language";
import FinanceOverview from "@/components/finance/FinanceOverview";
import AdminFinance from "./AdminFinance";
import AdminPayments from "./AdminPayments";
import AdminPartnerFinance from "./AdminPartnerFinance";
import PaymentAccountsEditor from "@/components/admin/PaymentAccountsEditor";

/**
 * Unified Admin Finance Hub. Consolidates Platform Revenue, Mentor Payouts,
 * Payment Queue, and Partner Revenue-Share behind one polished tab interface.
 * Each tab embeds the existing detail page so source-of-truth numbers stay 1:1.
 */
const TABS = ["overview", "revenue", "queue", "partners", "settings"] as const;
type TabKey = typeof TABS[number];

export default function AdminFinanceHub() {
  const { lang } = useLanguage();
  const my = lang === "my";
  const [sp, setSp] = useSearchParams();
  const tab = (TABS.includes(sp.get("tab") as TabKey) ? sp.get("tab") : "overview") as TabKey;
  const setTab = (t: TabKey) => { const next = new URLSearchParams(sp); next.set("tab", t); setSp(next, { replace: true }); };

  const labels: Record<TabKey, { en: string; my: string }> = {
    overview: { en: "Overview", my: "ခြုံငုံ" },
    revenue: { en: "Revenue & Payouts", my: "ဝင်ငွေ & ပေးချေ" },
    queue: { en: "Payment Queue", my: "ပေးချေမှု တန်းစီ" },
    partners: { en: "Partner Rev-Share", my: "Partner ဝင်ငွေခွဲ" },
    settings: { en: "Payment Settings", my: "ပေးချေမှု ဆက်တင်" },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={my ? "ငွေကြေး ဗဟိုဌာန" : "Finance Hub"} />
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="mb-4 flex w-full flex-wrap justify-start">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t}>{my ? labels[t].my : labels[t].en}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <FinanceOverview
              days={30}
              onOpenQueue={() => setTab("queue")}
              onOpenRevenue={() => setTab("revenue")}
              onOpenPartners={() => setTab("partners")}
            />
          </TabsContent>

          <TabsContent value="revenue">
            <AdminFinance hideHeader />
          </TabsContent>

          <TabsContent value="queue">
            <AdminPayments hideHeader />
          </TabsContent>

          <TabsContent value="partners">
            <AdminPartnerFinance hideHeader />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
