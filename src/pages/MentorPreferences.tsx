import PageHeader from "@/components/PageHeader";
import MentorPreferencesSection from "@/components/settings/MentorPreferencesSection";
import { useLanguage } from "@/hooks/use-language";

const MentorPreferences = () => {
  const { lang } = useLanguage();
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <PageHeader
        title={lang === "my" ? "Mentor အခြေအနေ" : "Mentor Preferences"}
        backPath="/dashboard"
      />
      <div className="mx-auto max-w-3xl px-5 md:px-8 md:pt-2">
        <p className="mb-4 text-xs text-muted-foreground">
          {lang === "my"
            ? "သင့်နှုန်းထား၊ ရနိုင်သော အချိန်များနှင့် Booking အခြေအနေများ စီမံပါ"
            : "Manage your rate, time slots, and booking availability."}
        </p>
        <MentorPreferencesSection />
      </div>
    </div>
  );
};

export default MentorPreferences;
