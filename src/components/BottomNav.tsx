import { useEffect } from "react";
import { Home, Briefcase, Users, MessageSquare, User, LayoutDashboard, Calendar, Shield, BarChart3, CreditCard } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useRole } from "@/hooks/use-role";
import { useUserRoles } from "@/hooks/use-user-roles";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { role, setRole } = useRole();
  const { allowedRoles, isLoading, isSystemRole, isAdmin, isModerator } = useUserRoles();

  // If current role isn't allowed (and not a system role), reset to the first allowed role
  useEffect(() => {
    if (!isLoading && !isSystemRole && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      setRole(allowedRoles[0]);
    }
  }, [isLoading, allowedRoles, role, setRole, isSystemRole]);

  const jobseekerNav = [
    { icon: Home, labelMy: "ပင်မ", labelEn: "Home", path: "/home" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Jobs", path: "/jobs" },
    { icon: MessageSquare, labelMy: "အသိုင်း", labelEn: "Community", path: "/community" },
    { icon: Users, labelMy: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors" },
    { icon: User, labelMy: "ကျွန်ုပ်", labelEn: "Account", path: "/profile" },
  ];

  const employerNav = [
    { icon: LayoutDashboard, labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/employer/dashboard" },
    { icon: Briefcase, labelMy: "အလုပ်တင်", labelEn: "Post Job", path: "/employer/post-job" },
    { icon: Users, labelMy: "လျှောက်သူ", labelEn: "Applicants", path: "/employer/applications" },
    { icon: MessageSquare, labelMy: "အသိုင်း", labelEn: "Community", path: "/community" },
    { icon: User, labelMy: "အကောင့်", labelEn: "Account", path: "/profile" },
  ];

  const mentorNav = [
    { icon: LayoutDashboard, labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/mentors/dashboard" },
    { icon: Users, labelMy: "တပည့်များ", labelEn: "Mentees", path: "/mentors/mentees" },
    { icon: Calendar, labelMy: "ချိန်းဆိုမှု", labelEn: "Bookings", path: "/mentors/bookings" },
    { icon: MessageSquare, labelMy: "အသိုင်း", labelEn: "Community", path: "/community" },
    { icon: User, labelMy: "အကောင့်", labelEn: "Account", path: "/profile" },
  ];

  const adminNav = [
    { icon: LayoutDashboard, labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/admin" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Jobs", path: "/admin/jobs" },
    { icon: CreditCard, labelMy: "ငွေ", labelEn: "Payments", path: "/admin/payments" },
    { icon: Shield, labelMy: "စစ်ဆေး", labelEn: "Moderate", path: "/moderator" },
    { icon: Users, labelMy: "သုံးသူ", labelEn: "Users", path: "/admin/users" },
  ];

  const moderatorNav = [
    { icon: Shield, labelMy: "စစ်ဆေး", labelEn: "Moderate", path: "/moderator" },
    { icon: MessageSquare, labelMy: "အသိုင်း", labelEn: "Community", path: "/community" },
    { icon: User, labelMy: "အကောင့်", labelEn: "Account", path: "/profile" },
  ];

  const navItems = isAdmin
    ? adminNav
    : isModerator
      ? moderatorNav
      : role === "employer"
        ? employerNav
        : role === "mentor"
          ? mentorNav
          : jobseekerNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/admin" && item.path !== "/moderator" && location.pathname.startsWith(item.path + "/"));
          const exactActive = location.pathname === item.path;
          const active = isActive || exactActive;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
              <span className={cn("text-[10px] leading-tight", active ? "font-semibold" : "font-medium")}>
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
