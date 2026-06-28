import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sanitizeJobPaymentMethods } from "@/lib/payment-methods";

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
  categories: string[] | null;
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
  expires_at?: string | null;
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
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((job) => ({
        ...job,
        payment_methods: sanitizeJobPaymentMethods((job as Job).payment_methods),
      })) as Job[];
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
      return data ? ({
        ...data,
        payment_methods: sanitizeJobPaymentMethods((data as Job).payment_methods),
      } as Job) : null;
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
      // Audit A11: skip rows whose underlying job has been deleted (no FK cascade exists yet).
      const orphans = (data || []).filter((s: any) => !s.jobs).map((s: any) => s.id);
      if (orphans.length > 0) {
        try { await supabase.from("saved_jobs").delete().in("id", orphans); } catch { /* best effort */ }
      }
      return (data || [])
        .filter((saved: any) => !!saved.jobs)
        .map((saved: any) => ({
          ...saved,
          jobs: {
            ...saved.jobs,
            payment_methods: sanitizeJobPaymentMethods(saved.jobs.payment_methods),
          },
        }));
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
    onMutate: async ({ jobId, isSaved }) => {
      // Optimistic update so the bookmark UI feels instant on slow networks.
      await queryClient.cancelQueries({ queryKey: ["saved-job-ids"] });
      const previous = queryClient.getQueryData<string[]>(["saved-job-ids", user?.id]) || [];
      const next = isSaved ? previous.filter(id => id !== jobId) : [...previous, jobId];
      queryClient.setQueryData(["saved-job-ids", user?.id], next);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["saved-job-ids", user?.id], ctx.previous);
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

      // If a manual cover letter was provided, persist it as a user_document of type "Cover"
      // so we can store its id in applications.cover_letter_id (FK to user_documents).
      let coverLetterId: string | null = null;
      if (coverLetter && coverLetter.trim().length > 0) {
        const { data: doc, error: docErr } = await (supabase as any)
          .from("user_documents")
          .insert({
            user_id: user.id,
            file_name: `cover-letter-${jobId}.txt`,
            file_url: "",
            file_type: "Cover",
            parsed_text: coverLetter,
          })
          .select("id")
          .single();
        if (docErr) throw docErr;
        coverLetterId = doc?.id ?? null;
      }

      // If a previous application exists (e.g. withdrawn / rejected), reactivate it
      // instead of inserting (which would violate the UNIQUE(job_id, applicant_id) constraint).
      const { data: existing } = await supabase
        .from("applications")
        .select("id, status")
        .eq("applicant_id", user.id)
        .eq("job_id", jobId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("applications")
          .update({
            status: "applied",
            cover_letter_id: coverLetterId,
            resume_id: cvDocumentId || null,
            withdrawn_at: null,
            rejection_reason: "",
            rejection_reason_my: "",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("applications")
          .insert([{
            applicant_id: user.id,
            job_id: jobId,
            cover_letter_id: coverLetterId,
            resume_id: cvDocumentId || null,
            status: "applied",
          } as any]);
        if (error) throw error;
      }


      // Notify employer about new application
      const { data: job } = await supabase.from("jobs").select("employer_id, title, title_my, company").eq("id", jobId).single();
      const { data: applicantProfile } = await (supabase as any).from("v_profiles").select("display_name").eq("id", user.id).maybeSingle();
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

        // Email employer
        const { sendAppEmail } = await import("@/lib/send-app-email");
        sendAppEmail({
          templateName: "application-received",
          recipientUserId: job.employer_id,
          idempotencyKey: `app-received-${user.id}-${jobId}`,
          templateData: { applicantName, jobTitle: job.title, company: job.company },
        });

        // Welcome bonus email — only if the DB trigger actually granted it.
        const { data: bonusTx } = await supabase
          .from("wallet_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("ref_type", "signup_bonus")
          .maybeSingle();
        if (bonusTx) {
          sendAppEmail({
            templateName: "welcome-bonus",
            recipientUserId: user.id,
            idempotencyKey: `welcome-bonus-${user.id}`,
            templateData: { name: applicantName },
          });
        }
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["job", vars.jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
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
    staleTime: 15_000,
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
        .select("*, jobs!inner(*), cover_letter_doc:user_documents!applications_cover_letter_id_fkey(parsed_text, file_name, file_url)")
        .eq("jobs.employer_id", user.id)
        .order("created_at", { ascending: false });
      if (jobId) query = query.eq("job_id", jobId);
      const { data, error } = await query;
      if (error) throw error;
      // Fetch applicant profiles
      const applicantIds = [...new Set((data || []).map(a => a.applicant_id))];
      if (!applicantIds.length) return data || [];
      const { data: profiles } = await (supabase as any)
        .from("v_profiles")
        .select("id, display_name, headline, avatar_url, location, skills, experience, languages")
        .in("id", applicantIds);
      const profileMap = new Map<string, any>(((profiles as any[]) || []).map((p: any) => [p.id, p]));
      return (data || []).map((app: any) => ({
        ...app,
        applicant_profile: profileMap.get(app.applicant_id),
        cover_letter: app.cover_letter_doc?.parsed_text || null,
      })) as any[];

    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 30000,
  });
}

/**
 * Per-job applicant breakdown for the current employer/agent.
 * Returns a Map of jobId -> { total, new, shortlisted, interview, offered, placed, rejected }.
 * Used by EmployerJobs to show an at-a-glance pipeline per listing.
 */
export function useEmployerJobApplicantBreakdown() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employer-job-applicant-breakdown", user?.id],
    queryFn: async () => {
      const map = new Map<string, { total: number; new: number; shortlisted: number; interview: number; offered: number; placed: number; rejected: number }>();
      if (!user) return map;
      const { data, error } = await supabase
        .from("applications")
        .select("status, job_id, jobs!inner(employer_id)")
        .eq("jobs.employer_id", user.id);
      if (error) throw error;
      for (const row of (data || []) as any[]) {
        const id = row.job_id as string;
        const cur = map.get(id) || { total: 0, new: 0, shortlisted: 0, interview: 0, offered: 0, placed: 0, rejected: 0 };
        const s = row.status as string;
        if (s !== "withdrawn") cur.total++;
        if (s === "applied" || s === "submitted" || s === "viewed") cur.new++;
        else if (s === "shortlisted") cur.shortlisted++;
        else if (s === "interview" || s === "interviewed") cur.interview++;
        else if (s === "offered") cur.offered++;
        else if (s === "placed") cur.placed++;
        else if (s === "rejected") cur.rejected++;
        map.set(id, cur);
      }
      return map;
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
