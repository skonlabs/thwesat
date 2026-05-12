import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

/**
 * Centralised labels for screens shared between Employer and Recruiting Agent.
 * Per project memory, Agent reuses Employer routes/screens but with its own
 * vocabulary ("Client" instead of "Company", "Candidates" instead of "Applicants").
 */
export function useRoleLabels() {
  const { effectiveRole } = useAuth() as any;
  const { language: lang } = useLanguage();
  const isAgent = effectiveRole === "agent";

  const t = (en: string, my: string) => (lang === "my" ? my : en);

  return {
    isAgent,
    company:    isAgent ? t("Client", "ဖောက်သည်")           : t("Company", "ကုမ္ပဏီ"),
    companies:  isAgent ? t("Clients", "ဖောက်သည်များ")     : t("Companies", "ကုမ္ပဏီများ"),
    applicant:  isAgent ? t("Candidate", "ကိုယ်စားလှယ်လောင်း")  : t("Applicant", "လျှောက်ထားသူ"),
    applicants: isAgent ? t("Candidates", "ကိုယ်စားလှယ်လောင်းများ") : t("Applicants", "လျှောက်ထားသူများ"),
    posting:    isAgent ? t("Listing", "ကြော်ငြာ")           : t("Job", "အလုပ်"),
    postings:   isAgent ? t("Listings", "ကြော်ငြာများ")      : t("Jobs", "အလုပ်များ"),
    dashboard:  isAgent ? t("Agent Dashboard", "အေဂျင့် ဒက်ရှ်ဘုတ်") : t("Employer Dashboard", "အလုပ်ရှင် ဒက်ရှ်ဘုတ်"),
  };
}
