import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";

interface PageHeaderProps {
  title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/60">
      <div className="flex items-center justify-between px-5 py-3.5">
        <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>
        <div className="flex items-center gap-2.5">
          <LanguageToggle />
          <button
            onClick={() => navigate("/settings")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
