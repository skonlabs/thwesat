import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";

interface PageHeaderProps {
  title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40">
      {/* Thin golden accent stripe */}
      <div className="h-[3px] bg-gradient-gold" />

      <div className="bg-card shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          {/* Title with golden dot accent */}
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-gradient-gold shadow-gold" />
            <h1 className="text-[17px] font-bold tracking-tight text-foreground">{title}</h1>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={() => navigate("/settings")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
              aria-label="Settings"
            >
              <Settings className="h-[17px] w-[17px]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
