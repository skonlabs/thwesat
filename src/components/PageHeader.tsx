import { ArrowLeft, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

const PageHeader = ({ title, showBack = false, onBack }: PageHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div className="flex items-center justify-between px-6 pb-3 pt-6">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={handleBack} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle variant="icon" />
        <button onClick={() => navigate("/settings")} className="rounded-full bg-muted p-2 text-muted-foreground active:scale-95">
          <Settings className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
};

export default PageHeader;
