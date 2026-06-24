import { useEffect } from "react";
import { Home, Briefcase, Users, MessageSquare, User, LayoutDashboard, Calendar, Shield, CreditCard, CheckCircle, FileText, WalletCards, CalendarClock } from "lucide-react";
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
  const { allowedRoles, isLoading, isSystemRole, isAdmin, isPartner } = useUserRoles();
  const { data: unreadMessages = 0 } = useUnreadMessageCount();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();

  // If current role isn't allowed (and not a system role), reset to the first allowed role
  useEffect(() => {
    if (!isLoading && !isSystemRole && !allowedRoles.includes(role)) {
      if (allowedRoles && allowedRoles.length > 0) setRole(allowedRoles[0]);
    }
  }, [isLoading, allowedRoles, role, setRole, isSystemRole]);

  type NavItem = { icon: typeof Home; labelMy: string; labelEn: string; path: string; badgeKey?: "messages" | "notifications" };

  const jobseekerNav: NavItem[] = [
    { icon: Home, labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/dashboard" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Jobs", path: "/jobs" },
    { icon: Users, labelMy: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors" },
    { icon: FileText, labelMy: "အသက်မွေး ကိရိယာ", labelEn: "Career Tools", path: "/ai-tools" },
    { icon: User, labelMy: "ကျွန်ုပ်", labelEn: "Account", path: "/profile" },
  ];

  const employerNav: NavItem[] = [
    { icon: LayoutDashboard, labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/dashboard" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Jobs", path: "/employer/jobs" },
    { icon: Users, labelMy: "လျှောက်သူ", labelEn: "Applicants", path: "/employer/applications" },
    { icon: CheckCircle, labelMy: "ခန့်အပ်မှု", labelEn: "Placements", path: "/employer/applications?filter=placed" },
    { icon: User, labelMy: "အကောင့်", labelEn: "Account", path: "/profile" },
  ];

  const agentNav: NavItem[] = [
    { icon: LayoutDashboard, labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/dashboard" },
    { icon: Briefcase, labelMy: "ခေါ်ယူမှု", labelEn: "Job Postings", path: "/agent/jobs" },
    { icon: CheckCircle, labelMy: "ခန့်အပ်မှု", labelEn: "Placements", path: "/agent/candidates?filter=placed" },
    { icon: User, labelMy: "အကောင့်", labelEn: "Account", path: "/profile" },
  ];

  const mentorNav: NavItem[] = [
    { icon: LayoutDashboard, labelMy: "ပင်မ", labelEn: "Dashboard", path: "/dashboard" },
    { icon: Calendar, labelMy: "ဘွတ်ကင်", labelEn: "Bookings", path: "/mentors/bookings" },
    { icon: CalendarClock, labelMy: "အချိန်ဇယား", labelEn: "Availability", path: "/mentor/preferences" },
    { icon: MessageSquare, labelMy: "မက်ဆေ့", labelEn: "Messages", path: "/messages", badgeKey: "messages" },
    { icon: User, labelMy: "ကျွန်ုပ်", labelEn: "Account", path: "/profile" },
  ];

  const adminNav: NavItem[] = [
    { icon: LayoutDashboard, labelMy: "ပင်မ", labelEn: "Dashboard", path: "/dashboard" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Job Postings", path: "/admin/jobs" },
    { icon: WalletCards, labelMy: "ငွေကြေး", labelEn: "Finance", path: "/admin/finance" },
    { icon: Users, labelMy: "သုံးသူ", labelEn: "Users", path: "/admin/users" },
    { icon: User, labelMy: "ကျွန်ုပ်", labelEn: "Account", path: "/profile" },
  ];

  const partnerNav: NavItem[] = [
    { icon: LayoutDashboard, labelMy: "ပင်မ", labelEn: "Dashboard", path: "/dashboard" },
    { icon: Briefcase, labelMy: "အလုပ်", labelEn: "Jobs", path: "/partner/jobs" },
    { icon: CheckCircle, labelMy: "ပို့စ်", labelEn: "Posts", path: "/partner/posts" },
    { icon: Users, labelMy: "သုံးသူ", labelEn: "Users", path: "/partner/users" },
    { icon: User, labelMy: "ကျွန်ုပ်", labelEn: "Account", path: "/profile" },
  ];

  const navItems: NavItem[] = isAdmin
    ? adminNav
    : isPartner
      ? partnerNav
      : role === "employer"
        ? employerNav
        : role === "agent"
          ? agentNav
          : role === "mentor"
            ? mentorNav
            : jobseekerNav;

  const getBadge = (key?: "messages" | "notifications") => {
    if (key === "messages") return unreadMessages;
    if (key === "notifications") return unreadNotifications;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-shell bg-shell pb-safe text-shell-foreground md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2 md:max-w-2xl lg:max-w-3xl" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {navItems.map((item) => {
          const [itemPath, itemQuery] = item.path.split("?");
          const pathMatches = location.pathname === itemPath || (itemPath !== "/admin" && location.pathname.startsWith(itemPath + "/"));
          const currentFilter = new URLSearchParams(location.search).get("filter");
          const itemFilter = itemQuery ? new URLSearchParams(itemQuery).get("filter") : null;
          // Sibling routes share a pathname but differ by ?filter=. Match filter when relevant.
          const hasSiblingWithFilter = navItems.some((n) => n !== item && n.path.split("?")[0] === itemPath);
          const filterMatches = hasSiblingWithFilter ? currentFilter === itemFilter : true;
          const active = pathMatches && filterMatches;
          const badge = getBadge(item.badgeKey);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors",
                active ? "text-accent" : "text-shell-foreground/65"
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
              <span className={cn("max-w-[64px] truncate text-[10px] leading-tight", active ? "font-semibold" : "font-medium")}>
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
