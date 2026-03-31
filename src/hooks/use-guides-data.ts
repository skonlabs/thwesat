import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Guide {
  id: string;
  title: string;
  title_my: string | null;
  category: string;
  content: string;
  content_my: string | null;
  country: string | null;
  country_flag: string | null;
  read_time_minutes: number | null;
  is_new: boolean | null;
  is_verified: boolean | null;
  verified_by: string | null;
  created_at: string | null;
}

export function useGuides() {
  return useQuery({
    queryKey: ["guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Guide[];
    },
  });
}

export function useGuide(id: string | undefined) {
  return useQuery({
    queryKey: ["guide", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Guide | null;
    },
    enabled: !!id,
  });
}
