import { Settings, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";
import logo from "@/assets/logo.png";

interface PageHeaderProps {
  title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
        <button onClick={() => navigate("/home")} className="flex items-center gap-2">
          <img src={logo} alt="ThweSone" className="h-7 w-7 rounded-md" />
          <span className="text-sm font-bold text-gradient-gold">ThweSone</span>
        </button>
        <div className="flex items-center gap-2">
          <LanguageToggle />
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
      <h1 className="px-5 pb-2 pt-3 text-lg font-bold text-foreground">{title}</h1>
    </header>
  );
};

export default PageHeader;
