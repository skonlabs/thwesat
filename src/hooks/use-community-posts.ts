import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

export interface CommunityPost {
  id: string;
  author_id: string;
  content_my: string;
  content_en: string | null;
  category: string | null;
  is_approved: boolean | null;
  likes_count: number | null;
  shares_count: number | null;
  image_url: string | null;
  created_at: string | null;
  author?: {
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
    location: string | null;
  };
}

export function useCommunityPosts(category?: string) {
  const { lang } = useLanguage();

  return useQuery({
    queryKey: ["community-posts", category, lang],
    queryFn: async () => {
      let query = supabase
        .from("community_posts")
        .select("*")
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (category && category !== "All") {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (error) throw error;

      const authorIds = [...new Set((data || []).map((p) => p.author_id))];
      if (authorIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, headline, avatar_url, location")
        .in("id", authorIds);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return (data || []).map((post) => ({
        ...post,
        author: profileMap.get(post.author_id) || {
          display_name: lang === "my" ? "အမည်မသိ" : "Unknown",
          headline: null,
          avatar_url: null,
          location: null,
        },
      })) as CommunityPost[];
    },
  });
}

export function useCreatePost() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentMy, contentEn, category, imageUrl }: { contentMy: string; contentEn?: string; category: string; imageUrl?: string }) => {
      if (!user) throw new Error(lang === "my" ? "အကောင့်ဝင်ထားခြင်း မရှိပါ" : "Not authenticated");
      const { error } = await supabase
        .from("community_posts")
        .insert({
          author_id: user.id,
          content_my: contentMy,
          content_en: contentEn || contentMy,
          category,
          image_url: imageUrl || null,
          is_approved: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("community_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}
