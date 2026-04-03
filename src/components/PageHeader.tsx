import { useState, useRef, useCallback } from "react";
import { MessageSquare, Bell, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import LanguageToggle from "@/components/LanguageToggle";
import logo from "@/assets/logo.svg";

interface PageHeaderProps {
  title: string;
  backPath?: string;
  onBack?: () => void;
}

const PageHeader = ({ title, backPath, onBack }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const [logoOpacity, setLogoOpacity] = useState(1);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const holdStart = useRef<number>(0);
  const animFrame = useRef<number>(0);

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
      localStorage.clear();
      sessionStorage.clear();
      navigate("/");
    }, 3000);
  }, [navigate, lang]);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    setLogoOpacity(1);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex items-center justify-between px-5 py-2.5">
          <button
            onClick={() => navigate(role === "employer" ? "/employer/dashboard" : role === "mentor" ? "/mentors/dashboard" : "/home")}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            className="flex items-center gap-2 select-none"
          >
            <img
              src={logo}
              alt="ThweSone"
              className="h-7 w-7 rounded-md transition-opacity"
              style={{ opacity: logoOpacity }}
              draggable={false}
            />
            <span className="text-sm font-bold"><span className="text-primary">Thwe</span><span className="text-accent">Sone</span></span>
          </button>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <button
              onClick={() => navigate("/notifications")}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
              aria-label={lang === "my" ? "အကြောင်းကြားချက်များ" : "Notifications"}
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
            <button
              onClick={() => navigate("/messages")}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
              aria-label={lang === "my" ? "မက်ဆေ့ချ်များ" : "Messages"}
            >
              <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
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
        {(backPath || onBack) && (
          <button onClick={() => onBack ? onBack() : navigate(backPath!)} className="mr-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted">
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
        )}
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </div>
    </>
  );
};

export default PageHeader;
