import { Bell, MessageSquare, Search } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useRole } from "@/hooks/use-role";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useUnreadMessageCount, useUnreadNotificationCount } from "@/hooks/use-unread-counts";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LanguageToggle from "@/components/LanguageToggle";

type NavItem = { labelMy: string; labelEn: string; path: string };

const DesktopNav = () => {
  const { lang } = useLanguage();
  const { role } = useRole();
  const { isAdmin, isModerator } = useUserRoles();
  const { profile } = useAuth();
  const { data: unreadMessages = 0 } = useUnreadMessageCount();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();
  const navigate = useNavigate();
  const location = useLocation();

  const seeker: NavItem[] = [
    { labelMy: "ပင်မ", labelEn: "Home", path: "/dashboard" },
    { labelMy: "အလုပ်", labelEn: "Jobs", path: "/jobs" },
    { labelMy: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors" },
    { labelMy: "လျှောက်လွှာ", labelEn: "Applications", path: "/applications" },
    { labelMy: "ကိရိယာ", labelEn: "Tools", path: "/ai-tools" },
    { labelMy: "လမ်းညွှန်စာ", labelEn: "Guides", path: "/guides" },
  ];
  const employer: NavItem[] = [
    { labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/dashboard" },
    { labelMy: "အလုပ်", labelEn: "Jobs", path: "/employer/jobs" },
    { labelMy: "လျှောက်သူ", labelEn: "Applicants", path: "/employer/applications" },
    { labelMy: "ရှာဖွေ", labelEn: "Search Talent", path: "/employer/search" },
    { labelMy: "ငွေကြေး", labelEn: "Finance", path: "/employer/finance" },
  ];
  const agent: NavItem[] = [
    { labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/dashboard" },
    { labelMy: "ခေါ်ယူမှု", labelEn: "Postings", path: "/agent/jobs" },
    { labelMy: "ကိုယ်စားလှယ်", labelEn: "Candidates", path: "/agent/candidates" },
    { labelMy: "ရှာဖွေ", labelEn: "Search Talent", path: "/agent/search" },
    { labelMy: "ငွေကြေး", labelEn: "Finance", path: "/agent/finance" },
  ];
  const mentor: NavItem[] = [
    { labelMy: "ပင်မ", labelEn: "Dashboard", path: "/dashboard" },
    { labelMy: "ဘွတ်ကင်", labelEn: "Bookings", path: "/mentors/bookings" },
    { labelMy: "ကျောင်းသား", labelEn: "Mentees", path: "/mentors/mentees" },
    { labelMy: "ငွေကြေး", labelEn: "Finance", path: "/mentor/finance" },
  ];
  const admin: NavItem[] = [
    { labelMy: "ပင်မ", labelEn: "Dashboard", path: "/dashboard" },
    { labelMy: "အလုပ်", labelEn: "Jobs", path: "/admin/jobs" },
    { labelMy: "သုံးသူ", labelEn: "Users", path: "/admin/users" },
    { labelMy: "ငွေကြေး", labelEn: "Finance", path: "/admin/finance" },
    { labelMy: "ငွေပေး", labelEn: "Payments", path: "/admin/payments" },
    { labelMy: "ခွဲခြမ်း", labelEn: "Analytics", path: "/admin/analytics" },
  ];
  const mod: NavItem[] = [
    { labelMy: "ဒက်ရှ်ဘုတ်", labelEn: "Dashboard", path: "/dashboard" },
    { labelMy: "စစ်ဆေး", labelEn: "Moderate", path: "/moderator" },
    { labelMy: "အသိုင်း", labelEn: "Community", path: "/community" },
  ];

  const items = isAdmin ? admin : isModerator ? mod : role === "employer" ? employer : role === "agent" ? agent : role === "mentor" ? mentor : seeker;

  const initials = ((profile as any)?.display_name || (profile as any)?.full_name || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-shell bg-shell text-shell-foreground md:block bg-gradient-to-r from-shell via-shell to-sidebar-accent/70 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-16 h-48 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6 lg:px-10">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="ThweSat" width={30} height={30} />
          <span className="font-brand text-lg font-semibold">
            <span className="text-shell-foreground">Thwe</span><span className="text-accent">Sat</span>
          </span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          {items.map((it) => {
            const [base] = it.path.split("?");
            const active = location.pathname === base || location.pathname.startsWith(base + "/");
            return (
              <NavLink
                key={it.path}
                to={it.path}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-shell-foreground/70 hover:bg-sidebar-accent hover:text-shell-foreground",
                )}
              >
                {lang === "my" ? it.labelMy : it.labelEn}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => navigate("/jobs")} className="hidden h-9 w-9 items-center justify-center rounded-full text-shell-foreground/70 hover:bg-sidebar-accent hover:text-shell-foreground lg:flex">
            <Search className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button onClick={() => navigate("/messages")} className="relative flex h-9 w-9 items-center justify-center rounded-full text-shell-foreground/70 hover:bg-sidebar-accent hover:text-shell-foreground">
            <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
            {unreadMessages > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </button>
          <button onClick={() => navigate("/notifications")} className="relative flex h-9 w-9 items-center justify-center rounded-full text-shell-foreground/70 hover:bg-sidebar-accent hover:text-shell-foreground">
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            {unreadNotifications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>
          <button onClick={() => navigate("/profile")} className="ml-1 flex items-center">
            <Avatar className="h-9 w-9 border border-shell">
              <AvatarImage src={(profile as any)?.avatar_url || undefined} alt="" />
              <AvatarFallback className="bg-accent text-xs text-accent-foreground">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DesktopNav;
