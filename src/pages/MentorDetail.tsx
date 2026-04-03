import { motion } from "framer-motion";
import { Star, MapPin, Calendar, MessageCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useMentorProfile } from "@/hooks/use-mentor-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStartConversation } from "@/hooks/use-start-conversation";
import PageHeader from "@/components/PageHeader";

const MentorDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const { startConversation } = useStartConversation();
  const { data: mentor, isLoading } = useMentorProfile(id);

  const { data: reviews = [] } = useQuery({
    queryKey: ["mentor-reviews", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from("mentor_reviews").select("*").eq("mentor_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      const reviewerIds = [...new Set((data || []).map(r => r.reviewer_id))];
      if (!reviewerIds.length) return data || [];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", reviewerIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(r => ({ ...r, reviewer: pMap.get(r.reviewer_id) }));
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!mentor) {
    return <div className="min-h-screen bg-background p-5"><PageHeader title="Mentor" backPath="/mentors" /><p className="text-center text-muted-foreground">{lang === "my" ? "မတွေ့ပါ" : "Not found"}</p></div>;
  }

  const displayName = mentor.profile?.display_name || "Mentor";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-40">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်သူ" : "Mentor"} backPath="/mentors" />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">{initials}</div>
            <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{mentor.title}</p>
            <p className="text-xs text-muted-foreground">{mentor.company} · {mentor.location}</p>
            <div className="mt-3 flex items-center gap-4">
              {(mentor.rating_avg || 0) > 0 ? (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" strokeWidth={1.5} />
                  <span className="text-sm font-bold text-foreground">{mentor.rating_avg}</span>
                </div>
              ) : (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">{lang === "my" ? "အသစ် Mentor" : "New Mentor"}</span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {mentor.location || (lang === "my" ? "မသတ်မှတ်ရသေး" : "Not set")}</span>
              {mentor.is_available && (
                <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> {lang === "my" ? "ရရှိနိုင်" : "Available"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { value: mentor.total_sessions || 0, label: lang === "my" ? "ချိန်းဆိုမှု" : "Sessions" },
              { value: mentor.total_mentees || 0, label: lang === "my" ? "လူဦးရေ" : "Mentees" },
              { value: `$${mentor.hourly_rate || 0}/hr`, label: lang === "my" ? "နှုန်းထား" : "Rate" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကိုယ်ရေးအကျဉ်း" : "About"}</h2>
            <p className="text-sm leading-relaxed text-foreground/80">{lang === "my" ? (mentor.bio_my || mentor.bio) : (mentor.bio || mentor.bio_my)}</p>
          </div>

          {mentor.expertise && mentor.expertise.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Expertise"}</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((s) => (
                  <span key={s} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{s}</span>
                ))}
              </div>
            </div>
          )}

          {mentor.available_days && mentor.available_days.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ရရှိနိုင်ချိန်" : "Available Days"}</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.available_days.map((d) => (
                  <span key={d} className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">{d}</span>
                ))}
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "သုံးသပ်ချက်များ" : "Reviews"}</h2>
              <div className="space-y-3">
                {reviews.map((r: any) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-3.5">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{r.reviewer?.display_name || "User"}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: r.rating }).map((_, j) => (
                          <Star key={j} className="h-3 w-3 fill-primary text-primary" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground/80">{lang === "my" ? (r.review_text_my || r.review_text) : (r.review_text || r.review_text_my)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => id && startConversation(id)}>
            <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
          </Button>
          <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => navigate(`/mentors/book?mentorId=${id}`)}>
            <Calendar className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "ချိန်းဆိုရန်" : "Book"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MentorDetail;
