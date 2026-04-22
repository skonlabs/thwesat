import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Job {
  id: string;
  employer_id: string;
  title: string;
  title_my: string | null;
  company: string;
  location: string | null;
  job_type: string | null;
  role_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  category: string | null;
  skills: string[] | null;
  description: string | null;
  description_my: string | null;
  requirements: string | null;
  requirements_my: string | null;
  is_diaspora_safe: boolean | null;
  is_verified: boolean | null;
  is_featured: boolean;
  visa_sponsorship: boolean | null;
  requires_embassy: boolean | null;
  requires_work_permit: boolean | null;
  payment_methods: string[] | null;
  status: string | null;
  applicant_count: number | null;
  created_at: string | null;
  external_url: string | null;
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Job | null;
    },
    enabled: !!id,
  });
}

export function useSavedJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-jobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("*, jobs(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSavedJobIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-job-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map(d => d.job_id);
    },
    enabled: !!user,
  });
}

export function useToggleSaveJob() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, isSaved }: { jobId: string; isSaved: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isSaved) {
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", jobId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_jobs")
          .insert({ user_id: user.id, job_id: jobId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["saved-job-ids"] });
    },
  });
}

export function useApplyToJob() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, coverLetter, cvDocumentId }: { jobId: string; coverLetter?: string; cvDocumentId?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("applications")
        .insert({
          applicant_id: user.id,
          job_id: jobId,
          cover_letter: coverLetter || "",
          cv_document_id: cvDocumentId || null,
          status: "applied",
        });
      if (error) throw error;

      // Notify employer about new application
      const { data: job } = await supabase.from("jobs").select("employer_id, title, title_my").eq("id", jobId).single();
      const { data: applicantProfile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      const applicantName = applicantProfile?.display_name || "Someone";
      if (job) {
        await supabase.from("notifications").insert({
          user_id: job.employer_id,
          notification_type: "application",
          title: `New application from ${applicantName}`,
          title_my: `${applicantName} ထံမှ လျှောက်လွှာအသစ်`,
          description: `${applicantName} applied for ${job.title}`,
          description_my: `${applicantName} သည် ${job.title_my || job.title} အတွက် လျှောက်ထားပါပြီ`,
          link_path: "/employer/applications",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useApplications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(*)")
        .eq("applicant_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useEmployerJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employer-jobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!user,
  });
}

export function useEmployerApplications(jobId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employer-applications", user?.id, jobId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("applications")
        .select("*, jobs!inner(*)")
        .eq("jobs.employer_id", user.id)
        .order("created_at", { ascending: false });
      if (jobId) query = query.eq("job_id", jobId);
      const { data, error } = await query;
      if (error) throw error;
      // Fetch applicant profiles
      const applicantIds = [...new Set((data || []).map(a => a.applicant_id))];
      if (!applicantIds.length) return data || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, headline, avatar_url, location, skills, experience, languages")
        .in("id", applicantIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(app => ({ ...app, applicant_profile: profileMap.get(app.applicant_id) })) as any[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function usePendingJobs() {
  return useQuery({
    queryKey: ["pending-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
  });
}
