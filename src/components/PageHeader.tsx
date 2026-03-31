import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";

interface PageHeaderProps {
  title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
      <div className="px-5 pb-3 pt-4">
        <div className="rounded-[28px] border border-border bg-card px-4 py-3 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                ThweSone
              </p>
              <h1 className="truncate text-[20px] font-bold leading-none text-foreground">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button
                onClick={() => navigate("/settings")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all active:scale-95"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
