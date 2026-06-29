import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useWallet, formatMMK } from "@/hooks/use-wallet";

/**
 * Compact wallet balance chip. Visible for every signed-in user —
 * wallet_transactions is the single ledger across roles, so every
 * user has a wallet row (credits may be 0 today for employer/agent
 * but will start incrementing the moment we hand out credits).
 */
const WalletChip = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data: wallet } = useWallet();

  if (!user) return null;

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
