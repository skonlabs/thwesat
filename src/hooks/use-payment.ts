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
  booking_id: string | null;
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
      booking_id?: string;
      proof_url?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (!(req.amount > 0)) throw new Error("Amount must be greater than zero");

      const { error } = await supabase
        .from("payment_requests")
        .insert({ ...req, user_id: user.id } as any);
      if (error) throw error;

      // If this is a mentor session payment, flip the booking to "pending payment verification"
      if (req.payment_type === "mentor_session" && req.booking_id) {
        await supabase
          .from("mentor_bookings")
          .update({ payment_status: "pending" } as any)
          .eq("id", req.booking_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["payment-user-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
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

/**
 * Approve / reject / revoke a payment request.
 *
 * All side-effects (subscription extension, employer tier, booking payment
 * status, mentor earnings, notifications) are handled atomically inside the
 * `review_payment_request` Postgres function. The function is idempotent and
 * validates the amount against the matching subscription plan when known.
 */
export function useUpdatePaymentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_note,
    }: {
      id: string;
      status: "approved" | "rejected" | "revoked";
      admin_note?: string;
    }) => {
      const { data, error } = await (supabase as any).rpc("review_payment_request", {
        _payment_id: id,
        _new_status: status,
        _admin_note: admin_note ?? null,
      });
      if (error) throw new Error(error.message || "Failed to review payment");
      return data as { ok: boolean; status: string; noop?: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] });
      queryClient.invalidateQueries({ queryKey: ["payment-user-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-earnings"] });
      queryClient.invalidateQueries({ queryKey: ["employer-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Lookup helpers for the admin payment sheet — gives the admin context
 * before approving (booking details for mentor sessions, company name for
 * employer subscriptions).
 */
export function usePaymentBookingContext(bookingId: string | null | undefined) {
  return useQuery({
    queryKey: ["payment-booking-context", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const { data, error } = await supabase
        .from("mentor_bookings")
        .select("id, mentor_id, mentee_id, scheduled_date, scheduled_time, topic, status, payment_status")
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });
}

export function usePaymentEmployerContext(userId: string | null | undefined, paymentType: string) {
  return useQuery({
    queryKey: ["payment-employer-context", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("id, company_name, subscription_tier, subscription_expires_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && paymentType === "employer_subscription",
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
