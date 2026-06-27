import { motion } from "framer-motion";
import { MapPin, Globe, Briefcase, MessageCircle, ArrowLeft, Phone, Mail, Laptop, Wifi, Wallet, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { useGuestGate } from "@/hooks/use-guest-gate";
import { useUserRoles } from "@/hooks/use-user-roles";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { UserRoleBadges } from "@/components/RoleBadge";
import { useFeatureUnlocks } from "@/hooks/use-wallet";

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { startConversation } = useStartConversation();
  const requireAuth = useGuestGate();
  const { hasRole } = useUserRoles();

  // Check if target user is a mentor or employer (so messaging is allowed for everyone)
  const { data: targetIsMessageable } = useQuery({
    queryKey: ["is-messageable", id],
    queryFn: async () => {
      if (!id) return false;
      const [m, e] = await Promise.all([
        supabase.from("mentor_profiles").select("id", { head: true, count: "exact" }).eq("id", id),
        (supabase as any).from("employer_profiles_public").select("id", { head: true, count: "exact" }).eq("id", id),
      ]);
      return (m.count ?? 0) > 0 || (e.count ?? 0) > 0;
    },
    enabled: !!id,
  });

  const currentUserCanMessageAnyone = hasRole("mentor") || hasRole("employer") || hasRole("agent");
  const isHiringSide = hasRole("employer") || hasRole("agent");
  // For hiring-side viewers messaging a seeker, gate Message on contact unlock.
  const { data: contactUnlocks = [] } = useFeatureUnlocks("unlock_contact");
  const targetIsSeeker = !!id && targetIsMessageable === false;
  const targetContactUnlocked = !!id && (contactUnlocks || []).some((u: any) => u.target_id === id);
  const hiringSideBlocked = isHiringSide && targetIsSeeker && !targetContactUnlocked;
  const canMessage = (currentUserCanMessageAnyone || !!targetIsMessageable) && !hiringSideBlocked;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });


  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-dvh bg-background pb-24">
        <PageHeader title={lang === "my" ? "ပရိုဖိုင်" : "Profile"} showBack />
        <div className="flex flex-col items-center py-16 text-center px-5">
          <p className="text-sm text-muted-foreground">{lang === "my" ? "ပရိုဖိုင် မတွေ့ပါ" : "Profile not found"}</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {lang === "my" ? "နောက်သို့" : "Go Back"}
          </Button>
        </div>
      </div>
    );
  }

  const isOwn = user?.id === profile.id;
  const visibility = (profile.visibility || "public") as "public" | "members" | "private" | "employers";

  if (!isOwn) {
    if (visibility === "members" && !user) {
      navigate("/login", { replace: true });
      return null;
    }
    if (visibility === "private") {
      return (
        <div className="min-h-dvh bg-background pb-24">
          <PageHeader title={lang === "my" ? "ပရိုဖိုင်" : "Profile"} showBack />
          <div className="flex flex-col items-center py-16 text-center px-5">
            <p className="text-sm font-semibold text-foreground">
              {lang === "my" ? "ဤပရိုဖိုင်ကို ကြည့်ရှုခွင့် မရှိပါ" : "This profile is private"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "my" ? "ပိုင်ရှင်က ဖော်ပြထားခြင်း မရှိပါ" : "The owner has restricted access"}
            </p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> {lang === "my" ? "နောက်သို့" : "Go Back"}
            </Button>
          </div>
        </div>
      );
    }
    if (visibility === "employers") {
      const isEmployerOrSystem = hasRole("employer") || hasRole("agent");
      if (!isEmployerOrSystem) {
        return (
          <div className="min-h-dvh bg-background pb-24">
            <PageHeader title={lang === "my" ? "ပရိုဖိုင်" : "Profile"} showBack />
            <div className="flex flex-col items-center py-16 text-center px-5">
              <p className="text-sm font-semibold text-foreground">
                {lang === "my" ? "ဤပရိုဖိုင်သည် အလုပ်ရှင်များသာ ကြည့်ရှုနိုင်သည်" : "This profile is only visible to employers"}
              </p>
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> {lang === "my" ? "နောက်သို့" : "Go Back"}
              </Button>
            </div>
          </div>
        );
      }
    }
  }

  const readiness = [
    { ok: !!profile.remote_ready, icon: Globe, en: "Remote ready", my: "အဝေးထိန်းရနိုင်" },
    { ok: !!profile.has_laptop, icon: Laptop, en: "Has laptop", my: "လက်တော့ ရှိ" },
    { ok: !!profile.internet_stable, icon: Wifi, en: "Stable internet", my: "အင်တာနက် တည်ငြိမ်" },
    { ok: !!profile.has_wise, icon: Wallet, en: "Wise account", my: "Wise အကောင့်" },
    { ok: !!profile.has_upwork, icon: Wallet, en: "Upwork account", my: "Upwork အကောင့်" },
  ];
  const readinessVisible = profile.primary_role === "job_seeker" && readiness.some(r => r.ok);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပရိုဖိုင်" : "Profile"} showBack />
      <div className="px-5 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                (profile.display_name || "U").slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-lg font-bold text-foreground">{profile.display_name || "User"}</h1>
                <UserRoleBadges userId={profile.id} />
              </div>
              {profile.headline && <p className="text-xs text-muted-foreground">{profile.headline}</p>}
              {profile.role_title && <p className="text-xs text-primary font-medium">{profile.role_title}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {profile.location && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" strokeWidth={1.5} /> {profile.location}
                  </span>
                )}
                {profile.primary_role === "job_seeker" && (() => {
                  const s = (profile as any).job_search_status || "open";
                  const map: Record<string, { en: string; my: string; cls: string }> = {
                    open: { en: "Open for Job", my: "အလုပ်လက်ခံနိုင်", cls: "bg-emerald/10 text-emerald" },
                    casual: { en: "Casually Looking", my: "လေ့လာနေဆဲ", cls: "bg-accent/15 text-accent-foreground" },
                    not_looking: { en: "Not Looking", my: "မရှာသေး", cls: "bg-muted text-muted-foreground" },
                  };
                  const m = map[s] || map.open;
                  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>{lang === "my" ? m.my : m.en}</span>;
                })()}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အကြောင်း" : "About"}</h3>
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Skills */}
          {(profile.skills || []).length > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှု" : "Skills"}</h3>
              <div className="flex flex-wrap gap-1.5">
                {(profile.skills || []).map((s: string) => (
                  <span key={s} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Preferred work types */}
          {(profile.preferred_work_types || []).length > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "လိုလားသော အလုပ်အမျိုးအစား" : "Preferred Work Types"}</h3>
              <div className="flex flex-wrap gap-1.5">
                {(profile.preferred_work_types || []).map((s: string) => (
                  <span key={s} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/80">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Work readiness */}
          {readinessVisible && (
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အလုပ်လုပ်နိုင်မှု" : "Work Readiness"}</h3>
              <div className="grid grid-cols-2 gap-2">
                {readiness.filter(r => r.ok).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-emerald/5 px-2.5 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald" strokeWidth={2} />
                    <span className="text-[11px] text-foreground">{lang === "my" ? r.my : r.en}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="mb-4 rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အချက်အလက်" : "Details"}</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              {profile.experience && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>{lang === "my" ? "အတွေ့အကြုံ" : "Experience"}: {profile.experience}</span>
                </div>
              )}
              {(profile.languages || []).length > 0 && (
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>{(profile.languages || []).join(", ")}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{profile.website}</a>
                </div>
              )}
              {isHiringSide && profile.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <a href={`mailto:${profile.email}`} className="text-primary underline break-all">{profile.email}</a>
                </div>
              )}
              {isHiringSide && profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <a href={`tel:${profile.phone}`} className="text-primary underline">{profile.phone}</a>
                </div>
              )}
            </div>
          </div>


          {/* Actions */}
          {!isOwn && user && canMessage && (
            <div className="mx-auto w-full max-w-md">
              <Button
                variant="default"
                size="lg"
                className="w-full rounded-xl"
                onClick={() => startConversation(profile.id)}
              >
                <MessageCircle className="mr-1.5 h-4 w-4" />
                {lang === "my" ? "စကားပြော" : "Message"}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PublicProfile;
