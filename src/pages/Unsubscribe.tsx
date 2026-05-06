import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type State = "validating" | "valid" | "invalid" | "already" | "submitting" | "done" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("validating");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (data?.valid === true) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.success) setState("done");
      else if ((data as any)?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-xl font-bold text-primary mb-2">
            Thwe<span className="text-gold">Sone</span>
          </div>
          <CardTitle>Email preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "validating" && <p className="text-muted-foreground">Checking your link…</p>}
          {state === "valid" && (
            <>
              <p>Click below to unsubscribe from ThweSone emails. You'll still receive critical account and security messages.</p>
              <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
            </>
          )}
          {state === "submitting" && <p className="text-muted-foreground">Updating your preferences…</p>}
          {state === "done" && (
            <p className="text-foreground">You've been unsubscribed. Sorry to see you go.</p>
          )}
          {state === "already" && (
            <p className="text-muted-foreground">This email address is already unsubscribed.</p>
          )}
          {state === "invalid" && (
            <p className="text-destructive">This unsubscribe link is invalid or has expired.</p>
          )}
          {state === "error" && (
            <p className="text-destructive">{error || "Something went wrong. Please try again."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
