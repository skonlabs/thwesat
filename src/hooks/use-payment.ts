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

const ALLOWED_PAYMENT_METHODS = [
  "kbzpay",
  "wavepay",
  "ayapay",
  "bank_transfer",
  "payoneer",
  "wise",
  "manual",
] as const;

const ALLOWED_PAYMENT_TYPES = [
  "subscription",
  "placement_fee",
  "mentor_session",
] as const;

const MAX_AMOUNT = 10_000_000;
const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

type AllowedPaymentMethod = (typeof ALLOWED_PAYMENT_METHODS)[number];
type AllowedPaymentType = (typeof ALLOWED_PAYMENT_TYPES)[number];

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

      // Upper-bound validation
      if (req.amount > MAX_AMOUNT) {
        throw new Error(`Amount exceeds maximum allowed value of ${MAX_AMOUNT.toLocaleString()}`);
      }

      // Whitelist payment_method
      if (!ALLOWED_PAYMENT_METHODS.includes(req.payment_method as AllowedPaymentMethod)) {
        throw new Error(
          `Invalid payment method "${req.payment_method}". Allowed: ${ALLOWED_PAYMENT_METHODS.join(", ")}`
        );
      }

      // Whitelist payment_type
      if (!ALLOWED_PAYMENT_TYPES.includes(req.payment_type as AllowedPaymentType)) {
        throw new Error(
          `Invalid payment type "${req.payment_type}". Allowed: ${ALLOWED_PAYMENT_TYPES.join(", ")}`
        );
      }

      const { error } = await supabase
        .from("payment_requests")
        .insert({ ...req, user_id: user.id } as any);
      if (error) throw error;

      // NOTE: The two-step update below (payment insert then booking status update) is
      // intentionally non-atomic — there is no distributed transaction between the two
      // table writes. If the booking update fails after the payment insert succeeds the
      // database will be in an inconsistent state. A future improvement should wrap
      // both operations in a single Postgres RPC/function to make this atomic.
      if (req.payment_type === "mentor_session" && req.booking_id) {
        try {
          const { error: bookingError } = await supabase
            .from("mentor_bookings")
            .update({ payment_status: "pending" } as any)
            .eq("id", req.booking_id);

          if (bookingError) {
            // Payment was already inserted — log the error and surface a warning to the
            // caller so they can follow up, rather than silently ignoring the failure.
            console.error(
              "[useCreatePaymentRequest] Payment inserted but booking status update failed:",
              bookingError
            );
            throw new Error(
              "Payment was recorded but the booking status could not be updated. " +
              "Please contact support with your booking ID: " + req.booking_id
            );
          }
        } catch (err) {
          // Re-throw so the mutation's onError handler can surface it to the user.
          throw err;
        }
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
  // File size check: reject files larger than 5 MB
  if (file.size > MAX_PROOF_SIZE_BYTES) {
    throw new Error(`File is too large. Maximum allowed size is 5 MB (file is ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
  }

  // File type check: only accept image files
  if (!file.type.startsWith("image/")) {
    throw new Error(`Invalid file type "${file.type}". Only image files are accepted as payment proof.`);
  }

  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  // Store the path, not a public URL (bucket is private)
  return path;
}

/**
 * Extracts the storage object path from a full Supabase storage URL.
 * Handles both public (/object/public/) and authenticated (/object/authenticated/)
 * URL formats. If the input is already a bare path (not a URL), it is returned as-is.
 */
const getStoragePath = (urlOrPath: string): string => {
  if (!urlOrPath.startsWith("http")) return urlOrPath; // already a path
  try {
    const url = new URL(urlOrPath);
    const publicMarker = "/object/public/";
    const idx = url.pathname.indexOf(publicMarker);
    if (idx !== -1) {
      // Strip the bucket prefix too — return just the object path within the bucket
      const afterMarker = url.pathname.slice(idx + publicMarker.length);
      const slashIdx = afterMarker.indexOf("/");
      return slashIdx !== -1 ? afterMarker.slice(slashIdx + 1) : afterMarker;
    }
    const privateMarker = "/object/authenticated/";
    const idx2 = url.pathname.indexOf(privateMarker);
    if (idx2 !== -1) {
      const afterMarker = url.pathname.slice(idx2 + privateMarker.length);
      const slashIdx = afterMarker.indexOf("/");
      return slashIdx !== -1 ? afterMarker.slice(slashIdx + 1) : afterMarker;
    }
  } catch { /* fall through */ }
  return urlOrPath;
};

// Helper to get a signed URL for viewing payment proofs
export async function getPaymentProofSignedUrl(proofPath: string): Promise<string | null> {
  if (!proofPath) return null;
  // Normalise legacy full URLs to a bare storage path
  const path = getStoragePath(proofPath);
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 86400); // 24 hour expiry
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
