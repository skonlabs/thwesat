import { useState, useRef, useCallback } from "react";
import { Settings, MessageSquare, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import LanguageToggle from "@/components/LanguageToggle";
import logo from "@/assets/logo.svg";

interface PageHeaderProps {
  title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lang } = useLanguage();
  const [logoOpacity, setLogoOpacity] = useState(1);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const holdStart = useRef<number>(0);
  const animFrame = useRef<number>(0);

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
      toast({
        title: lang === "my" ? "ထွက်ပြီးပါပြီ" : "Signed out",
        description: lang === "my" ? "Local Data အားလုံး ရှင်းလင်းပြီးပါပြီ" : "All local data cleared",
      });
      navigate("/");
    }, 3000);
  }, [navigate, toast, lang]);

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
            onClick={() => navigate("/home")}
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
            <span className="text-sm font-bold text-gradient-gold">ThweSone</span>
          </button>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <button
              onClick={() => navigate("/notifications")}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
            <button
              onClick={() => navigate("/messages")}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
              aria-label="Messages"
            >
              <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>
      <h1 className="px-5 pb-1 pt-3 text-lg font-bold text-foreground">{title}</h1>
    </>
  );
};

export default PageHeader;
