import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2, MapPin, Globe, Linkedin, Mail, Phone, CheckCircle, Briefcase,
  Sparkles, Target, Compass, Heart, ArrowLeft, MessageCircle, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";

const CompanyProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { startConversation } = useStartConversation();

  const { data, isLoading } = useQuery({
    queryKey: ["company-profile", id],
    queryFn: async () => {
      if (!id) return null;
      const [empRes, profRes, jobsRes] = await Promise.all([
        supabase.from("employer_profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("profiles").select("display_name, avatar_url, headline, website").eq("id", id).maybeSingle(),
        supabase.from("jobs").select("id, title, title_my, location, job_type, created_at, applicant_count").eq("employer_id", id).eq("status", "active").order("created_at", { ascending: false }).limit(20),
      ]);
      return {
        employer: empRes.data,
        profile: profRes.data,
        jobs: jobsRes.data || [],
      };
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data?.employer) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title={lang === "my" ? "ကုမ္ပဏီ" : "Company"} showBack />
        <div className="flex flex-col items-center py-16 text-center px-5">
          <Building2 className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ကုမ္ပဏီ မတွေ့ပါ" : "Company not found"}</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {lang === "my" ? "နောက်သို့" : "Go Back"}
          </Button>
        </div>
      </div>
    );
  }

  const e = data.employer as any;
  const p = data.profile as any;
  const isOwn = user?.id === id;
  const logoUrl = e.logo_url || p?.avatar_url;
  const initials = (e.company_name || "C").slice(0, 2).toUpperCase();

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <div className="text-sm leading-relaxed text-foreground/85">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ကုမ္ပဏီ ပရိုဖိုင်" : "Company Profile"} showBack />

      {/* Hero / Cover */}
      <div className="relative">
        <div
          className="h-32 w-full bg-gradient-to-br from-primary via-primary/80 to-accent"
          style={e.cover_url ? { backgroundImage: `url(${e.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="px-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="-mt-12 flex items-end gap-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-lg">
              {logoUrl ? (
                <img src={logoUrl} alt={e.company_name || "Company"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-2xl font-bold text-primary-foreground">{initials}</div>
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-xl font-bold text-foreground">{e.company_name || (lang === "my" ? "အမည်မပါ" : "Unnamed Company")}</h1>
                {e.is_verified && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald">
                    <CheckCircle className="h-3 w-3" strokeWidth={2} />
                    {lang === "my" ? "အတည်ပြု" : "Verified"}
                  </span>
                )}
              </div>
              {e.industry && <p className="text-xs font-medium text-primary">{e.industry}</p>}
            </div>
          </motion.div>

          {/* Quick facts */}
          <div className="mt-4 flex flex-wrap gap-2">
            {e.hq_country && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" strokeWidth={1.5} /> {e.hq_country}
              </span>
            )}
            {e.company_size && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                <Briefcase className="h-3 w-3" strokeWidth={1.5} /> {e.company_size} {lang === "my" ? "ဝန်ထမ်း" : "employees"}
              </span>
            )}
            {data.jobs.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent-foreground/80">
                <Sparkles className="h-3 w-3" strokeWidth={1.5} /> {data.jobs.length} {lang === "my" ? "လစ်လပ်ရာထူး" : "open roles"}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            {isOwn ? (
              <Button variant="default" size="sm" className="flex-1 rounded-xl" onClick={() => navigate("/employer/edit-company")}>
                {lang === "my" ? "ပြင်ဆင်ရန်" : "Edit Company"}
              </Button>
            ) : (
              user && (
                <Button variant="default" size="sm" className="flex-1 rounded-xl" onClick={() => startConversation(id!)}>
                  <MessageCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "စကားပြော" : "Message"}
                </Button>
              )
            )}
            {(e.company_website || p?.website) && (
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <a href={e.company_website || p?.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ဝဘ်ဆိုဒ်" : "Website"}
                </a>
              </Button>
            )}
          </div>

          {/* About / What we do */}
          {(e.what_we_do || e.company_description) && (
            <Section icon={Heart} title={lang === "my" ? "ကျွန်ုပ်တို့ဘာလုပ်သလဲ" : "What We Do"}>
              <p className="whitespace-pre-line">{e.what_we_do || e.company_description}</p>
            </Section>
          )}

          {/* Mission */}
          {e.mission && (
            <Section icon={Target} title={lang === "my" ? "ရည်မှန်းချက် (Mission)" : "Our Mission"}>
              <p className="whitespace-pre-line">{e.mission}</p>
            </Section>
          )}

          {/* Vision */}
          {e.vision && (
            <Section icon={Compass} title={lang === "my" ? "မျှော်မှန်းချက် (Vision)" : "Our Vision"}>
              <p className="whitespace-pre-line">{e.vision}</p>
            </Section>
          )}

          {/* Benefits */}
          {Array.isArray(e.benefits) && e.benefits.length > 0 && (
            <Section icon={Sparkles} title={lang === "my" ? "ဝန်ထမ်း အကျိုးခံစားခွင့်များ" : "Employee Benefits"}>
              <div className="flex flex-wrap gap-2">
                {e.benefits.map((b: string) => (
                  <span key={b} className="rounded-full bg-emerald/10 px-3 py-1.5 text-xs font-medium text-emerald">
                    ✓ {b}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Address & contact */}
          {(e.full_address || e.contact_name || e.contact_email || e.contact_phone || e.company_linkedin) && (
            <Section icon={MapPin} title={lang === "my" ? "ဆက်သွယ်ရန်" : "Contact & Address"}>
              <div className="space-y-2 text-xs">
                {e.full_address && (
                  <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} /><span>{e.full_address}</span></div>
                )}
                {e.contact_name && (
                  <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} /><span>{e.contact_name}</span></div>
                )}
                {e.contact_email && (
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} /><a className="text-primary underline-offset-4 hover:underline" href={`mailto:${e.contact_email}`}>{e.contact_email}</a></div>
                )}
                {e.contact_phone && (
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} /><a className="text-primary underline-offset-4 hover:underline" href={`tel:${e.contact_phone}`}>{e.contact_phone}</a></div>
                )}
                {e.company_linkedin && (
                  <div className="flex items-center gap-2"><Linkedin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} /><a className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline" href={e.company_linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <ExternalLink className="h-3 w-3" /></a></div>
                )}
              </div>
            </Section>
          )}

          {/* Open jobs */}
          {data.jobs.length > 0 && (
            <Section icon={Briefcase} title={lang === "my" ? "လစ်လပ်ရာထူးများ" : "Open Positions"}>
              <div className="space-y-2">
                {data.jobs.map((j: any) => (
                  <button
                    key={j.id}
                    onClick={() => navigate(`/jobs/${j.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/40 active:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{lang === "my" && j.title_my ? j.title_my : j.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[j.location, j.job_type].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {j.applicant_count || 0} {lang === "my" ? "ဦး" : "applicants"}
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Empty state for company with nothing */}
          {!e.what_we_do && !e.company_description && !e.mission && !e.vision && !(e.benefits?.length) && !e.full_address && (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
              <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground">
                {lang === "my" ? "ဤကုမ္ပဏီသည် ဖော်ပြချက် ထည့်မထားသေးပါ" : "This company hasn't added details yet"}
              </p>
              {isOwn && (
                <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={() => navigate("/employer/edit-company")}>
                  {lang === "my" ? "အချက်အလက် ဖြည့်ရန်" : "Add details"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
