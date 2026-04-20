import { useState, useRef, useCallback, useEffect } from "react";
import { MessageSquare, Bell, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useNotifications } from "@/hooks/use-notifications-data";
import { useConversations } from "@/hooks/use-messages-data";
import LanguageToggle from "@/components/LanguageToggle";
import logo from "@/assets/logo.svg";

interface PageHeaderProps {
  title: string;
  /** Fallback path used only when there is no prior in-app history (e.g. opened via direct link). Default browser-back is preferred. */
  backPath?: string;
  /** Custom back handler. When provided, takes precedence over default browser-back. */
  onBack?: () => void;
  /** When true, always show the back button (even if no backPath/onBack is provided) using browser history. Defaults to true when backPath is set. */
  showBack?: boolean;
}

const PageHeader = ({ title, backPath, onBack, showBack }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { role } = useRole();
  const { allowedRoles } = useUserRoles();
  const { data: notifications = [] } = useNotifications();
  const { data: conversations = [] } = useConversations();
  const unreadNotifCount = notifications.filter((n: any) => !n.is_read).length;
  const unreadMsgCount = conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
  const [logoOpacity, setLogoOpacity] = useState(1);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const holdStart = useRef<number>(0);
  const animFrame = useRef<number>(0);
  const effectiveRole = allowedRoles.includes(role) ? role : allowedRoles[0] || role;

  const displayName = profile?.display_name || "U";
  const initial = displayName.charAt(0).toUpperCase();

  const startHold = useCallback(() => {
    holdStart.current = Date.now();
    const animate = () => {
      const elapsed = Date.now() - holdStart.current;
      const progress = Math.min(elapsed / 3000, 1);
      setLogoOpacity(1 - progress * 0.7);
      if (progress < 1) {
        animFrame.current = requestAnimationFrame(animate);
      }
    };
    animFrame.current = requestAnimationFrame(animate);
    holdTimer.current = setTimeout(() => {
      // Panic exit: preserve user language preference, clear everything else
      const preservedLang = localStorage.getItem("thwesat_lang");
      localStorage.clear();
      sessionStorage.clear();
      if (preservedLang) localStorage.setItem("thwesat_lang", preservedLang);
      navigate("/");
    }, 3000);
  }, [navigate]);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (animFrame.current) {
      cancelAnimationFrame(animFrame.current);
      animFrame.current = 0;
    }
    setLogoOpacity(1);
  }, []);

  // Cleanup on unmount to prevent stale timers from firing after navigation
  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex items-center justify-between px-5 py-2.5">
          <button
            onClick={() => navigate(effectiveRole === "employer" ? "/employer/dashboard" : effectiveRole === "mentor" ? "/mentors/dashboard" : "/home")}
            onTouchStart={(e) => { e.currentTarget.dataset.touched = "1"; startHold(); }}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            onMouseDown={(e) => { if (e.currentTarget.dataset.touched === "1") return; startHold(); }}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            className="flex items-center gap-2 select-none"
          >
            <img
              src={logo}
              alt="ThweSat"
              className="h-7 w-7 rounded-md transition-opacity"
              style={{ opacity: logoOpacity }}
              draggable={false}
            />
            <span className="text-sm font-bold"><span className="text-primary">Thwe</span><span className="text-accent">Sat</span></span>
          </button>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <button
              onClick={() => navigate("/notifications")}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
              aria-label={lang === "my" ? "အကြောင်းကြားချက်များ" : "Notifications"}
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
              {unreadNotifCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/messages")}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
              aria-label={lang === "my" ? "မက်ဆေ့ချ်များ" : "Messages"}
            >
              <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
              {unreadMsgCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors active:opacity-80"
              aria-label={lang === "my" ? "ပရိုဖိုင်" : "Profile"}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover ring-1.5 ring-border" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-1.5 ring-border">
                  {initial}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>
      <div className="flex items-center px-5 pb-1 pt-3">
        {(backPath || onBack || showBack) && (
          <button
            onClick={() => {
              if (onBack) return onBack();
              // Prefer browser back so the user returns exactly where they came from.
              // Only fall back to backPath when there is no in-app history (direct link / fresh tab).
              if (window.history.length > 1) {
                navigate(-1);
              } else if (backPath) {
                navigate(backPath);
              } else {
                navigate("/home");
              }
            }}
            aria-label={lang === "my" ? "နောက်သို့" : "Back"}
            className="mr-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
        )}
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </div>
    </>
  );
};

export default PageHeader;
