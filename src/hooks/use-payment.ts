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
      const assertNoError = (error: { message?: string } | null, fallback: string) => {
        if (error) throw new Error(error.message || fallback);
      };

      const paymentLinkPath = (paymentType: string) => {
        if (paymentType === "employer_subscription") return "/employer/dashboard";
        if (paymentType === "mentor_session") return "/mentors";
        return "/premium";
      };

      const { data: paymentReq, error: fetchError } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      assertNoError(fetchError, "Failed to load payment request");
      if (!paymentReq) throw new Error("Payment request not found");

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
      assertNoError(error, "Failed to update payment request");

      // On approval, activate premium / subscription automatically
      if (status === "approved") {
        if (pr.payment_type === "subscription") {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", pr.user_id);
          assertNoError(profileError, "Failed to activate premium profile");

          let durationMonths = 1;
          if (pr.reference_id) {
            const { data: plan, error: planError } = await supabase
              .from("subscription_plans")
              .select("duration_months, plan_id")
              .eq("plan_id", pr.reference_id)
              .maybeSingle();
            assertNoError(planError, "Failed to load subscription plan");
            if (plan?.duration_months) durationMonths = plan.duration_months;
          }

          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

          const { error: subscriptionError } = await supabase
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
          assertNoError(subscriptionError, "Failed to create subscription");
        }

        if (pr.payment_type === "employer_subscription") {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", pr.user_id);
          assertNoError(profileError, "Failed to activate employer premium");

          let durationMonths = 12; // default yearly
          const planId = pr.reference_id || "employer_basic";
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

          const { error: subscriptionError } = await supabase
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
          assertNoError(subscriptionError, "Failed to create employer subscription");
        }

        const { error: approvalNotificationError } = await supabase.from("notifications").insert({
          user_id: pr.user_id,
          notification_type: "payment_approved",
          title: "Payment Approved",
          title_my: "ငွေပေးချေမှု အတည်ပြုပြီး",
          description: "Your payment has been approved and your account has been activated.",
          description_my: "သင့်ငွေပေးချေမှုကို အတည်ပြုပြီး သင့်အကောင့်ကို အသက်သွင်းပြီးပါပြီ။",
          link_path: paymentLinkPath(pr.payment_type),
        });
        assertNoError(approvalNotificationError, "Failed to notify user about approval");
      }

      if (status === "rejected") {
        const { error: rejectionNotificationError } = await supabase.from("notifications").insert({
          user_id: pr.user_id,
          notification_type: "payment_rejected",
          title: "Payment Rejected",
          title_my: "ငွေပေးချေမှု ပယ်ချခံရသည်",
          description: admin_note || "Your payment was not approved. Please try again or contact support.",
          description_my: admin_note || "သင့်ငွေပေးချေမှုကို အတည်မပြုပါ။ ထပ်မံကြိုးစားပါ သို့မဟုတ် ပံ့ပိုးကူညီမှုကို ဆက်သွယ်ပါ။",
          link_path: paymentLinkPath(pr.payment_type),
        });
        assertNoError(rejectionNotificationError, "Failed to notify user about rejection");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] });
      queryClient.invalidateQueries({ queryKey: ["payment-user-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
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
