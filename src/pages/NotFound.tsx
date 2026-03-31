import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Home, SearchX } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center"
      >
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent/15">
          <SearchX className="h-10 w-10 text-accent" strokeWidth={1.5} />
        </div>
        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-2 text-base font-semibold text-foreground">
          {lang === "my" ? "စာမျက်နှာ မတွေ့ပါ" : "Page not found"}
        </p>
        <p className="mb-8 max-w-xs text-sm text-muted-foreground">
          {lang === "my"
            ? "သင်ရှာဖွေနေသော စာမျက်နှာသည် ရှိမနေတော့ပါ သို့မဟုတ် ဖယ်ရှားထားပါသည်"
            : "The page you're looking for doesn't exist or has been moved"}
        </p>
        <Button variant="default" size="lg" className="w-full max-w-xs rounded-xl" onClick={() => navigate("/home")}>
          <Home className="mr-2 h-4 w-4" strokeWidth={1.5} />
          {lang === "my" ? "ပင်မစာမျက်နှာသို့" : "Back to Home"}
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
