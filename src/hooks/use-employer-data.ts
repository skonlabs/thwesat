import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

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
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Record<string, unknown>) => {
      if (!user) throw new Error(lang === "my" ? "အကောင့်ဝင်ထားခြင်း မရှိပါ" : "Not authenticated");
      const { error } = await supabase.from("employer_profiles").upsert({ id: user.id, ...profile });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-profile"] });
    },
  });
}

export function useCreateJob() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (job: Record<string, unknown>) => {
      if (!user) throw new Error(lang === "my" ? "အကောင့်ဝင်ထားခြင်း မရှိပါ" : "Not authenticated");
      const { error } = await supabase.from("jobs").insert({ employer_id: user.id, ...job } as any);
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, rejectionReason, rejectionReasonMy, placementSalary, placementFee, forwardedToEmail }: {
      id: string; status: string; rejectionReason?: string; rejectionReasonMy?: string; placementSalary?: number; placementFee?: number; forwardedToEmail?: string;
    }) => {
      const update: any = { status };
      if (rejectionReason) {
        update.rejection_reason = rejectionReason;
        // Prefer explicit Burmese mirror; otherwise mirror only if input itself is Burmese script
        if (rejectionReasonMy) {
          update.rejection_reason_my = rejectionReasonMy;
        } else if (/[\u1000-\u109F]/.test(rejectionReason)) {
          update.rejection_reason_my = rejectionReason;
        }
      }
      // Auto-stamp interview_date when transitioning to interview status
      if (status === "interview" || status === "interviewed") {
        update.interview_date = new Date().toISOString();
      }
      if (placementSalary !== undefined && placementSalary !== null) update.placement_salary = placementSalary;
      if (placementFee !== undefined && placementFee !== null) update.placement_fee = placementFee;
      if (forwardedToEmail) update.forwarded_to_email = forwardedToEmail;
      const { error } = await supabase.from("applications").update(update).eq("id", id);
      if (error) throw error;

      // Send notification to applicant about status change
      const { data: app } = await supabase.from("applications").select("applicant_id, job_id").eq("id", id).single();
      if (app) {
        const { data: job } = await supabase.from("jobs").select("title, title_my").eq("id", app.job_id).single();
        const jobTitle = job?.title || "Job";
        const jobTitleMy = job?.title_my || jobTitle;
        
        const notifMap: Record<string, { title: string; titleMy: string; desc: string; descMy: string; type: string }> = {
          viewed: { title: `Your application was viewed`, titleMy: `သင့်လျှောက်လွှာကို ကြည့်ရှုပြီး`, desc: `Employer viewed your application for ${jobTitle}`, descMy: `${jobTitleMy} အတွက် သင့်လျှောက်လွှာကို ကြည့်ရှုပြီး`, type: "application" },
          shortlisted: { title: `You've been shortlisted!`, titleMy: `ရွေးချယ်ခံရပါပြီ!`, desc: `Great news! You've been shortlisted for ${jobTitle}`, descMy: `${jobTitleMy} အတွက် ရွေးချယ်ခံရပါပြီ`, type: "application" },
          interview: { title: `Interview scheduled`, titleMy: `အင်တာဗျူး ချိန်းဆိုပြီး`, desc: `An interview has been scheduled for ${jobTitle}`, descMy: `${jobTitleMy} အတွက် အင်တာဗျူး ချိန်းဆိုပြီး`, type: "application" },
          interviewed: { title: `Interview scheduled`, titleMy: `အင်တာဗျူး ချိန်းဆိုပြီး`, desc: `An interview has been scheduled for ${jobTitle}`, descMy: `${jobTitleMy} အတွက် အင်တာဗျူး ချိန်းဆိုပြီး`, type: "application" },
          offered: { title: `Job offer received!`, titleMy: `အလုပ်ကမ်းလှမ်းချက် ရရှိပါပြီ!`, desc: `You received an offer for ${jobTitle}`, descMy: `${jobTitleMy} အတွက် ကမ်းလှမ်းချက် ရရှိပါပြီ`, type: "application" },
          placed: { title: `Congratulations! You're placed!`, titleMy: `ဂုဏ်ယူပါသည်! ခန့်အပ်ခံရပါပြီ!`, desc: `You've been placed for ${jobTitle}`, descMy: `${jobTitleMy} အတွက် ခန့်အပ်ခံရပါပြီ`, type: "application" },
          rejected: { title: `Application update`, titleMy: `လျှောက်လွှာ အခြေအနေ`, desc: rejectionReason || `Your application for ${jobTitle} was not selected`, descMy: rejectionReason || `${jobTitleMy} အတွက် သင့်လျှောက်လွှာ ရွေးချယ်ခံရခြင်း မရှိပါ`, type: "application" },
        };

        const notif = notifMap[status];
        if (notif) {
          await supabase.from("notifications").insert({
            user_id: app.applicant_id,
            notification_type: notif.type,
            title: notif.title,
            title_my: notif.titleMy,
            description: notif.desc,
            description_my: notif.descMy,
            link_path: "/applications",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      // Placement summary on the employer dashboard depends on application status.
      queryClient.invalidateQueries({ queryKey: ["employer-placements"] });
      // The notification we just inserted should appear immediately.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
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
      const authorIds = [...new Set((data || []).map((p) => p.author_id))];
      if (authorIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, headline, avatar_url")
        .in("id", authorIds);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      return (data || []).map((post) => ({
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
      const { data: post } = await supabase.from("community_posts").select("author_id").eq("id", postId).single();
      const { error } = await supabase.from("community_posts").update({ is_approved: true }).eq("id", postId);
      if (error) throw error;
      if (post?.author_id) {
        await supabase.from("notifications").insert({
          user_id: post.author_id,
          notification_type: "community",
          title: "Your post has been approved! ✅",
          title_my: "သင့်ပို့စ် အတည်ပြုပြီးပါပြီ! ✅",
          description: "Your post is now visible to the community.",
          description_my: "သင့်ပို့စ်ကို community တွင် မြင်နိုင်ပါပြီ။",
          link_path: "/community",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export function useApproveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data: job } = await supabase.from("jobs").select("employer_id, title, title_my").eq("id", jobId).maybeSingle();
      const { error } = await supabase.from("jobs").update({ status: "active", is_verified: true }).eq("id", jobId);
      if (error) throw error;
      // Notify the employer that their listing went live.
      if (job?.employer_id) {
        await supabase.from("notifications").insert({
          user_id: job.employer_id,
          notification_type: "job",
          title: "Your job listing is live",
          title_my: "သင့်အလုပ်ကြော်ငြာ စတင်ပြသပြီးပါပြီ",
          description: `"${job.title}" has been approved and is now visible to candidates.`,
          description_my: `"${job.title_my || job.title}" အတည်ပြုပြီး လူကြည့်နိုင်ပါပြီ။`,
          link_path: "/employer/dashboard",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}
