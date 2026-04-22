import { useEffect } from "react";
import { Home, Briefcase, Users, MessageSquare, User, LayoutDashboard, Calendar, Shield, BarChart3, CreditCard, Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useRole } from "@/hooks/use-role";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useUnreadMessageCount, useUnreadNotificationCount } from "@/hooks/use-unread-counts";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { role, setRole } = useRole();
  const { allowedRoles, isLoading, isSystemRole, isAdmin, isModerator } = useUserRoles();
  const { data: unreadMessages = 0 } = useUnreadMessageCount();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();

  // If current role isn't allowed (and not a system role), reset to the first allowed role
  useEffect(() => {
    if (!isLoading && !isSystemRole && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      setRole(allowedRoles[0]);
    }
  }, [isLoading, allowedRoles, role, setRole, isSystemRole]);

  type NavItem = { icon: typeof Home; labelMy: string; labelEn: string; path: string; badgeKey?: "messages" | "notifications" };

  const jobseekerNav: NavItem[] = [
    { icon: Home, labelMy: "ပင်မ", labelEn: "Home", path: "/home" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Jobs", path: "/jobs" },
    { icon: MessageSquare, labelMy: "မက်ဆေ့ချ်", labelEn: "Messages", path: "/messages", badgeKey: "messages" },
    { icon: Bell, labelMy: "အကြောင်းကြား", labelEn: "Alerts", path: "/notifications", badgeKey: "notifications" },
    { icon: User, labelMy: "ကျွန်ုပ်", labelEn: "Account", path: "/profile" },
  ];

  const employerNav: NavItem[] = [
    { icon: LayoutDashboard, labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/employer/dashboard" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Jobs", path: "/employer/jobs" },
    { icon: Users, labelMy: "လျှောက်သူ", labelEn: "Applicants", path: "/employer/applications" },
    { icon: CheckCircle, labelMy: "ခန့်အပ်မှု", labelEn: "Placements", path: "/employer/applications?filter=placed" },
    { icon: User, labelMy: "အကောင့်", labelEn: "Account", path: "/profile" },
  ];

  const mentorNav: NavItem[] = [
    { icon: LayoutDashboard, labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/mentors/dashboard" },
    { icon: Calendar, labelMy: "ချိန်းဆို", labelEn: "Bookings", path: "/mentors/bookings" },
    { icon: MessageSquare, labelMy: "မက်ဆေ့ချ်", labelEn: "Messages", path: "/messages", badgeKey: "messages" },
    { icon: Bell, labelMy: "အကြောင်းကြား", labelEn: "Alerts", path: "/notifications", badgeKey: "notifications" },
    { icon: User, labelMy: "အကောင့်", labelEn: "Account", path: "/profile" },
  ];

  const adminNav: NavItem[] = [
    { icon: LayoutDashboard, labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/admin" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Jobs", path: "/admin/jobs" },
    { icon: CreditCard, labelMy: "ငွေ", labelEn: "Payments", path: "/admin/payments" },
    { icon: Shield, labelMy: "စစ်ဆေး", labelEn: "Moderate", path: "/moderator" },
    { icon: Users, labelMy: "သုံးသူ", labelEn: "Users", path: "/admin/users" },
  ];

  const moderatorNav: NavItem[] = [
    { icon: Shield, labelMy: "စစ်ဆေး", labelEn: "Moderate", path: "/moderator" },
    { icon: MessageSquare, labelMy: "အသိုင်း", labelEn: "Community", path: "/community" },
    { icon: User, labelMy: "အကောင့်", labelEn: "Account", path: "/profile" },
  ];

  const navItems: NavItem[] = isAdmin
    ? adminNav
    : isModerator
      ? moderatorNav
      : role === "employer"
        ? employerNav
        : role === "mentor"
          ? mentorNav
          : jobseekerNav;

  const getBadge = (key?: "messages" | "notifications") => {
    if (key === "messages") return unreadMessages;
    if (key === "notifications") return unreadNotifications;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/admin" && item.path !== "/moderator" && location.pathname.startsWith(item.path + "/"));
          const exactActive = location.pathname === item.path;
          const active = isActive || exactActive;
          const badge = getBadge(item.badgeKey);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {active && (
                <span className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
              )}
              <div className="relative">
                <item.icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
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
