import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Coins, GraduationCap, CheckCircle2, Sparkles } from "lucide-react";

import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Track {
  id: string;
  title_en: string;
  title_my: string;
  description_en: string;
  description_my: string;
  price_credits: number;
  total_sessions: number;
  cover_url: string | null;
  mentor_id: string;
  is_active: boolean;
}

const CareerTracks = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: wallet } = useWallet();
  const [selected, setSelected] = useState<Track | null>(null);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["career-tracks"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("career_tracks").select("*").eq("is_active", true);
      return (data as Track[]) ?? [];
    },
  });

  const { data: mentors = {} } = useQuery({
    queryKey: ["track-mentors", tracks.map((t) => t.mentor_id).join(",")],
    queryFn: async () => {
      if (!tracks.length) return {};
      const ids = [...new Set(tracks.map((t) => t.mentor_id))];
      const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      return Object.fromEntries((data ?? []).map((p: any) => [p.id, p]));
    },
    enabled: tracks.length > 0,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any).from("career_track_enrollments").select("*").eq("user_id", user.id);
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });
  const enrolledIds = new Set(enrollments.map((e: any) => e.track_id));

  const enroll = useMutation({
    mutationFn: async (trackId: string) => {
      const { data, error } = await (supabase as any).rpc("enroll_career_track", { _track_id: trackId });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      setSelected(null);
      toast.success(lang === "my" ? "Track တွင် ဝင်ရောက်ပြီးပါပြီ" : "Enrolled successfully");
    },
    onError: (e: any) => {
      const m = e?.message || "";
      if (m.includes("insufficient_balance")) {
        toast.error(lang === "my" ? "Wallet လက်ကျန် မလုံလောက်ပါ" : "Not enough wallet balance");
        navigate("/wallet");
      } else toast.error(m || "Failed");
    },
  });

  const balance = wallet?.balance_credits ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "Career Tracks" : "Career Tracks"} />
      <div className="px-5 space-y-3">
        <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          {lang === "my"
            ? "Mentor တစ်ဦးနှင့် multi-session program။ Wallet မှ တစ်ကြိမ်တည်း ပေးချေပါ။"
            : "Multi-session programs guided by a mentor. One-time wallet payment."}
        </div>

        {isLoading && <div className="text-center text-xs text-muted-foreground">Loading...</div>}

        {tracks.map((t) => {
          const m = (mentors as any)[t.mentor_id];
          const enrolled = enrolledIds.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold">{lang === "my" ? t.title_my || t.title_en : t.title_en}</h3>
                    {enrolled && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> {lang === "my" ? "ပါဝင်ပြီး" : "Enrolled"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {lang === "my" ? t.description_my || t.description_en : t.description_en}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {m?.display_name || "Mentor"} · {t.total_sessions} {lang === "my" ? "session" : "sessions"}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-primary">
                      <Coins className="h-3 w-3" /> {t.price_credits.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {!isLoading && tracks.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            {lang === "my" ? "Track မရှိသေးပါ" : "No tracks available yet"}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="bottom-16 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t p-0">
          {selected && (
            <>
              <SheetHeader className="border-b px-5 py-3">
                <SheetTitle className="text-base">{lang === "my" ? selected.title_my || selected.title_en : selected.title_en}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-5 py-4">
                <p className="text-sm">{lang === "my" ? selected.description_my || selected.description_en : selected.description_en}</p>
                <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/10 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    {selected.total_sessions} {lang === "my" ? "session ပါဝင်" : "guided sessions"}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
                  <span className="text-muted-foreground">{lang === "my" ? "ဈေးနှုန်း" : "Price"}</span>
                  <span className="flex items-center gap-1 font-bold text-primary">
                    <Coins className="h-4 w-4" /> {selected.price_credits.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{lang === "my" ? "လက်ကျန်" : "Balance"}</span>
                  <span className="tabular-nums">{balance.toLocaleString()}</span>
                </div>
                {enrolledIds.has(selected.id) ? (
                  <Button disabled className="w-full">{lang === "my" ? "ပါဝင်ပြီး" : "Already enrolled"}</Button>
                ) : balance < selected.price_credits ? (
                  <Button onClick={() => navigate("/wallet")} className="w-full">
                    {lang === "my" ? "ငွေဖြည့်ရန်" : "Top up wallet"}
                  </Button>
                ) : (
                  <Button onClick={() => enroll.mutate(selected.id)} disabled={enroll.isPending} className="w-full">
                    {enroll.isPending ? "..." : (lang === "my" ? "ဝင်ရောက်ရန်" : "Enroll now")}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CareerTracks;
