import { ArrowLeft, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Use "flag" variant on gradient backgrounds */
  variant?: "default" | "gradient";
  rightContent?: React.ReactNode;
}

const PageHeader = ({ title, subtitle, showBack = false, onBack, variant = "default", rightContent }: PageHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const isGradient = variant === "gradient";

  return (
    <div className="flex items-center justify-between px-6 pb-3 pt-6">
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button onClick={handleBack} className={isGradient ? "text-primary-foreground/80" : "text-muted-foreground"}>
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className={`text-xl font-bold truncate ${isGradient ? "text-primary-foreground" : "text-foreground"}`}>{title}</h1>
          {subtitle && <p className={`text-xs ${isGradient ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {rightContent}
        <LanguageToggle variant={isGradient ? "flag" : "icon"} />
        <button onClick={() => navigate("/settings")} className={`rounded-full p-2 active:scale-95 ${isGradient ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PageHeader;
