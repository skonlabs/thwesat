import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";

export interface SubscriptionPlan {
  id: string;
  plan_id: string;
  country: string;
  duration_months: number | null;
  price: number;
  currency: string;
  name_en: string;
  name_my: string;
  badge_en: string | null;
  badge_my: string | null;
  save_label_en: string | null;
  save_label_my: string | null;
  sort_order: number;
}

export const useSubscriptionPlans = () => {
  const { lang } = useLanguage();
  const country = lang === "my" ? "MM" : "default";

  return useQuery({
    queryKey: ["subscription-plans", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("country", country)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data as unknown as SubscriptionPlan[]) ?? [];
    },
  });
};
