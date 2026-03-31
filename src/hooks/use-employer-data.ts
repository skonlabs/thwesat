import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useEmployerProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employer-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpsertEmployerProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("employer_profiles")
        .upsert({ id: user.id, ...profile });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-profile"] });
    },
  });
}

export function useCreateJob() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (job: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("jobs")
        .insert({ employer_id: user.id, ...job });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, rejectionReason, placementSalary, placementFee, forwardedToEmail }: {
      id: string; status: string; rejectionReason?: string; placementSalary?: number; placementFee?: number; forwardedToEmail?: string;
    }) => {
      const update: Record<string, unknown> = { status };
      if (rejectionReason) update.rejection_reason = rejectionReason;
      if (placementSalary) update.placement_salary = placementSalary;
      if (placementFee) update.placement_fee = placementFee;
      if (forwardedToEmail) update.forwarded_to_email = forwardedToEmail;
      const { error } = await supabase
        .from("applications")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profiles, jobs, mentors, pendingJobs, pendingPosts, scamReports] = await Promise.all([
        supabase.from("profiles").select("id, is_premium", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("mentor_profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("scam_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        totalUsers: profiles.count || 0,
        activeJobs: jobs.count || 0,
        totalMentors: mentors.count || 0,
        pendingJobs: pendingJobs.count || 0,
        pendingPosts: pendingPosts.count || 0,
        pendingReports: scamReports.count || 0,
      };
    },
  });
}

export function usePendingPosts() {
  return useQuery({
    queryKey: ["pending-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch author profiles
      const authorIds = [...new Set((data || []).map(p => p.author_id))];
      if (authorIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, headline, avatar_url")
        .in("id", authorIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(post => ({
        ...post,
        author: profileMap.get(post.author_id),
      }));
    },
  });
}

export function useApprovePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("community_posts")
        .update({ is_approved: true })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useApproveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("jobs")
        .update({ status: "active", is_verified: true })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useRejectJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("jobs")
        .update({ status: "rejected" })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-jobs"] });
    },
  });
}
