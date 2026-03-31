import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";

interface PageHeaderProps {
  title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        <LanguageToggle variant="icon" />
        <button
          onClick={() => navigate("/settings")}
          className="rounded-full bg-muted p-2 text-muted-foreground active:scale-95"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PageHeader;
