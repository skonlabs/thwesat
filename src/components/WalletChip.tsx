import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useWallet, formatMMK } from "@/hooks/use-wallet";
import { useRole } from "@/hooks/use-role";

/**
 * Compact wallet balance chip.
 * Only shown for Job Seekers and Mentors — Employers/Agents use the
 * subscription model (Packages & Add-ons), not the wallet.
 */
const WalletChip = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { role } = useRole();
  const { data: wallet } = useWallet();

  if (!user) return null;
  if (role !== "job_seeker" && role !== "mentor") return null;


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
