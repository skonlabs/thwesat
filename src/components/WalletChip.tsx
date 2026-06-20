import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useRole } from "@/hooks/use-role";
import { useWallet, formatMMK } from "@/hooks/use-wallet";

/**
 * Compact wallet balance chip for Job Seekers and Mentors only.
 * Employers / Agents use the subscription model — chip is hidden for them.
 */
const WalletChip = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { role } = useRole();
  const { data: wallet } = useWallet();

  if (role !== "jobseeker" && role !== "mentor") return null;

  const balance = wallet?.balance_credits ?? 0;
  return (
    <button
      onClick={() => navigate("/wallet")}
      className="flex h-8 items-center gap-1 rounded-full bg-sidebar-accent px-2.5 text-[11px] font-bold text-shell-foreground transition-colors hover:bg-sidebar-accent/80"
      aria-label={lang === "my" ? "ပိုက်ဆံအိတ်" : "Wallet"}
    >
      <WalletIcon className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
      <span className="tabular-nums">{formatMMK(balance, lang)}</span>
    </button>
  );
};

export default WalletChip;
