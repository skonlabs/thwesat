import { useLocation, useNavigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useLanguage } from "@/hooks/use-language";
import { LayoutDashboard, Briefcase, Users, BarChart3, CreditCard, Shield, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { path: "/admin", icon: LayoutDashboard, labelEn: "Dashboard", labelMy: "ဒက်ရှ်ဘုတ်" },
  { path: "/admin/jobs", icon: Briefcase, labelEn: "Jobs", labelMy: "အလုပ်" },
  { path: "/admin/users", icon: Users, labelEn: "Users", labelMy: "အသုံးပြုသူ" },
  { path: "/admin/payments", icon: CreditCard, labelEn: "Payments", labelMy: "ငွေပေးချေမှု" },
  { path: "/admin/analytics", icon: BarChart3, labelEn: "Analytics", labelMy: "ခွဲခြမ်းစိတ်ဖြာ" },
  { path: "/moderator", icon: Shield, labelEn: "Moderate", labelMy: "စစ်ဆေး" },
];

const moderatorLinks = [
  { path: "/moderator", icon: Shield, labelEn: "Moderate", labelMy: "စစ်ဆေး" },
  { path: "/community", icon: MessageCircle, labelEn: "Community", labelMy: "အသိုင်း" },
];

const SystemNav = () => {
  const { isAdmin, isModerator, isSystemRole } = useUserRoles();
  const { lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isSystemRole) return null;

  const links = isAdmin ? adminLinks : moderatorLinks;

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center gap-1 overflow-x-auto px-3 py-1.5 scrollbar-hide">
        {links.map((link) => {
          const isActive = location.pathname === link.path || (link.path !== "/admin" && link.path !== "/moderator" && location.pathname.startsWith(link.path));
          const exactActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
                exactActive || isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <link.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {lang === "my" ? link.labelMy : link.labelEn}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default SystemNav;
