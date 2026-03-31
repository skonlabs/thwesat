import { Home, Briefcase, Users, MessageSquare, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "ပင်မ", labelEn: "Home", path: "/home" },
  { icon: Briefcase, label: "အလုပ်", labelEn: "Jobs", path: "/jobs" },
  { icon: MessageSquare, label: "အသိုင်း", labelEn: "Community", path: "/community" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors" },
  { icon: User, label: "ကျွန်ုပ်", labelEn: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-all duration-200",
                  isActive && "scale-110"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[10px] font-medium leading-tight">
                {item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
