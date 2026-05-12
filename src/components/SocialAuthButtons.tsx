import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

type Provider = "google" | "facebook" | "linkedin_oidc";

interface Props {
  /** Optional role to persist for new signups (read after OAuth callback). */
  intendedRole?: string;
  /** Where to land after the provider redirects back. */
  redirectTo?: string;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 3.42 14.66 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12S6.76 21.5 12 21.5c6.93 0 9.5-4.86 9.5-9.3 0-.62-.07-1.1-.16-1.56H12z" />
    <path fill="#34A853" d="M3.86 7.36l3.2 2.34C7.93 7.94 9.81 6.5 12 6.5c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 3.42 14.66 2.5 12 2.5 8.4 2.5 5.27 4.55 3.86 7.36z" opacity="0" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#1877F2" d="M24 12a12 12 0 10-13.875 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.384A12.002 12.002 0 0024 12z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0z" />
  </svg>
);

const SocialAuthButtons = ({ intendedRole, redirectTo = "/dashboard" }: Props) => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [busy, setBusy] = useState<Provider | null>(null);

  const handle = async (provider: Provider) => {
    if (busy) return;
    setBusy(provider);
    try {
      // Stash intended role so post-OAuth code can apply it.
      if (intendedRole) {
        try { sessionStorage.setItem("thwesat_pending_role", intendedRole); } catch { /* ignore */ }
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        title: lang === "my" ? "ဝင်ရောက်မှု မအောင်မြင်ပါ" : "Could not sign in",
        description: msg,
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const labelContinue = lang === "my" ? "ဖြင့် ဆက်လုပ်ရန်" : "Continue with";

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => handle("google")}
        disabled={!!busy}
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition hover:bg-muted/40 disabled:opacity-60"
      >
        <GoogleIcon />
        <span>{labelContinue} Google</span>
      </button>
      <button
        type="button"
        onClick={() => handle("linkedin_oidc")}
        disabled={!!busy}
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition hover:bg-muted/40 disabled:opacity-60"
      >
        <LinkedInIcon />
        <span>{labelContinue} LinkedIn</span>
      </button>
      <button
        type="button"
        onClick={() => handle("facebook")}
        disabled={!!busy}
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition hover:bg-muted/40 disabled:opacity-60"
      >
        <FacebookIcon />
        <span>{labelContinue} Facebook</span>
      </button>

      <div className="flex items-center gap-3 pt-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {lang === "my" ? "သို့မဟုတ်" : "or"}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
};

export default SocialAuthButtons;
