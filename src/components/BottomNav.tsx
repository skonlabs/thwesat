import { Home, Briefcase, Users, MessageSquare, User, LayoutDashboard, GraduationCap, Calendar } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useRole } from "@/hooks/use-role";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { role } = useRole();

  const jobseekerNav = [
    { icon: Home, labelMy: "ပင်မ", labelEn: "Home", path: "/home" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Jobs", path: "/jobs" },
    { icon: MessageSquare, labelMy: "အသိုင်း", labelEn: "Community", path: "/community" },
    { icon: Users, labelMy: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors" },
    { icon: User, labelMy: "ကျွန်ုပ်", labelEn: "Account", path: "/profile" },
  ];

  const employerNav = [
    { icon: LayoutDashboard, labelMy: "Dashboard", labelEn: "Dashboard", path: "/employer/dashboard" },
    { icon: Briefcase, labelMy: "အလုပ်တင်", labelEn: "Post Job", path: "/employer/post-job" },
    { icon: Users, labelMy: "လျှောက်သူ", labelEn: "Applicants", path: "/employer/applications" },
    { icon: MessageSquare, labelMy: "အသိုင်း", labelEn: "Community", path: "/community" },
    { icon: User, labelMy: "ကျွန်ုပ်", labelEn: "Profile", path: "/profile" },
  ];

  const mentorNav = [
    { icon: LayoutDashboard, labelMy: "Dashboard", labelEn: "Dashboard", path: "/mentors/dashboard" },
    { icon: Users, labelMy: "Mentee", labelEn: "Mentees", path: "/mentors/mentees" },
    { icon: Calendar, labelMy: "Booking", labelEn: "Bookings", path: "/mentors/bookings" },
    { icon: MessageSquare, labelMy: "အသိုင်း", labelEn: "Community", path: "/community" },
    { icon: User, labelMy: "ကျွန်ုပ်", labelEn: "Profile", path: "/profile" },
  ];

  const navItems = role === "employer" ? employerNav : role === "mentor" ? mentorNav : jobseekerNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-medium")}>
                {lang === "my" ? item.labelMy : item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
