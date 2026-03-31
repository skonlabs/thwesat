import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";

interface PageHeaderProps {
  title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="flex items-center justify-between px-5 py-3.5">
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <div className="flex items-center gap-3">
          <LanguageToggle />
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
  );
};

export default PageHeader;
