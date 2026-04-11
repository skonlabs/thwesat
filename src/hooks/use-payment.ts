import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface PaymentRequest {
  id: string;
  user_id: string;
  payment_method: string;
  payment_type: string;
  amount: number;
  currency: string;
  reference_id: string | null;
  proof_url: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCreatePaymentRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: {
      payment_method: string;
      payment_type: string;
      amount: number;
      currency: string;
      reference_id?: string;
      proof_url?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("payment_requests")
        .insert({ ...req, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["payment-user-profiles"] });
    },
  });
}

export function useMyPaymentRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payment-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PaymentRequest[];
    },
    enabled: !!user,
  });
}

export function useAllPaymentRequests() {
  return useQuery({
    queryKey: ["payment-requests", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PaymentRequest[];
    },
  });
}

export function useUpdatePaymentRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, admin_note }: { id: string; status: string; admin_note?: string }) => {
      // First fetch the payment request to get user_id and type info
      const { data: paymentReq, error: fetchError } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;
      const pr = paymentReq as unknown as PaymentRequest;

      const updates: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
      };
      if (admin_note !== undefined) updates.admin_note = admin_note;
      const { error } = await supabase
        .from("payment_requests")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      // On approval, activate premium / subscription automatically
      if (status === "approved") {
        if (pr.payment_type === "subscription") {
          // Set is_premium on profile
          await supabase
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", pr.user_id);

          // Determine duration from reference_id (plan_id) or default 1 month
          let durationMonths = 1;
          if (pr.reference_id) {
            const { data: plan } = await supabase
              .from("subscription_plans")
              .select("duration_months, plan_id")
              .eq("plan_id", pr.reference_id)
              .maybeSingle();
            if (plan?.duration_months) durationMonths = plan.duration_months;
          }

          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

          await supabase
            .from("subscriptions")
            .insert({
              user_id: pr.user_id,
              plan_type: pr.reference_id || "premium",
              status: "active",
              currency: pr.currency,
              price_cents: Math.round(pr.amount * 100),
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              billing_cycle: durationMonths >= 12 ? "yearly" : "monthly",
            });
        }

        if (pr.payment_type === "employer_subscription") {
          await supabase
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", pr.user_id);

          // Create employer subscription record
          let durationMonths = 12; // default yearly
          const planId = pr.reference_id || "employer_basic";
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

          await supabase
            .from("subscriptions")
            .insert({
              user_id: pr.user_id,
              plan_type: planId,
              status: "active",
              currency: pr.currency,
              price_cents: Math.round(pr.amount * 100),
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              billing_cycle: "yearly",
            });
        }

        // Send notification to user
        await supabase.from("notifications").insert({
          user_id: pr.user_id,
          notification_type: "payment_approved",
          title: "Payment Approved",
          title_my: "ငွေပေးချေမှု အတည်ပြုပြီး",
          description: "Your payment has been approved and your account has been activated.",
          description_my: "သင့်ငွေပေးချေမှုကို အတည်ပြုပြီး သင့်အကောင့်ကို အသက်သွင်းပြီးပါပြီ။",
          link_path: pr.payment_type === "employer_subscription" ? "/employer/dashboard" : "/premium",
        });
      }

      if (status === "rejected") {
        await supabase.from("notifications").insert({
          user_id: pr.user_id,
          notification_type: "payment_rejected",
          title: "Payment Rejected",
          title_my: "ငွေပေးချေမှု ပယ်ချခံရသည်",
          description: admin_note || "Your payment was not approved. Please try again or contact support.",
          description_my: admin_note || "သင့်ငွေပေးချေမှုကို အတည်မပြုပါ။ ထပ်မံကြိုးစားပါ သို့မဟုတ် ပံ့ပိုးကူညီမှုကို ဆက်သွယ်ပါ။",
          link_path: "/premium",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] });
      queryClient.invalidateQueries({ queryKey: ["payment-user-profiles"] });
    },
  });
}

export async function uploadPaymentProof(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  // Store the path, not a public URL (bucket is private)
  return path;
}

// Helper to get a signed URL for viewing payment proofs
export async function getPaymentProofSignedUrl(proofPath: string): Promise<string | null> {
  if (!proofPath) return null;
  // Handle legacy full URLs - extract path
  let path = proofPath;
  if (proofPath.includes("/storage/v1/object/")) {
    const match = proofPath.match(/payment-proofs\/(.+)$/);
    if (match) path = match[1];
    else return proofPath; // fallback to raw URL
  }
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 3600); // 1 hour expiry
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
