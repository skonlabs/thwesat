import { useState } from "react";
import { Send, Copy, Check, ExternalLink } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SettingsBottomSheet from "./SettingsBottomSheet";

interface TelegramLinkSheetProps {
  open: boolean;
  onClose: () => void;
  isLinked: boolean;
  onLink: (username: string) => void;
  onUnlink: () => void;
}

const TelegramLinkSheet = ({ open, onClose, isLinked, onLink, onUnlink }: TelegramLinkSheetProps) => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [copied, setCopied] = useState(false);

  const botLink = "https://t.me/ThweSoneBot";

  const handleCopy = () => {
    navigator.clipboard.writeText(botLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SettingsBottomSheet
      open={open}
      onClose={onClose}
      title={lang === "my" ? "Telegram ချိတ်ဆက်ရန်" : "Link Telegram"}
    >
      {!isLinked ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Send className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {lang === "my" ? "အဆင့် ၁: Bot ကို Start လုပ်ပါ" : "Step 1: Start the Bot"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {lang === "my"
                  ? "ThweSone Bot ကို Telegram တွင်ဖွင့်ပြီး /start ကို နှိပ်ပါ"
                  : "Open ThweSone Bot on Telegram and tap /start"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-border bg-card px-3 py-2">
                  <p className="text-xs text-muted-foreground">{botLink}</p>
                </div>
                <button onClick={handleCopy} className="rounded-lg border border-border bg-card p-2 active:bg-muted">
                  {copied
                    ? <Check className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    : <Copy className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  }
                </button>
                <a href={botLink} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border bg-card p-2 active:bg-muted">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <p className="text-sm font-bold text-primary">@</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {lang === "my" ? "အဆင့် ၂: Username ထည့်ပါ" : "Step 2: Enter Username"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {lang === "my"
                  ? "သင့် Telegram username ကို ထည့်သွင်းပါ"
                  : "Enter your Telegram username below"}
              </p>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username"
                className="mt-2 h-11 rounded-xl"
              />
            </div>
          </div>

          <Button
            variant="default"
            size="lg"
            className="w-full rounded-xl"
            disabled={!username.trim()}
            onClick={() => {
              onLink(username);
              onClose();
            }}
          >
            {lang === "my" ? "ချိတ်ဆက်မည်" : "Link Telegram"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Check className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {lang === "my" ? "ချိတ်ဆက်ပြီးပါပြီ" : "Linked Successfully"}
              </p>
              <p className="text-xs text-muted-foreground">@{username || "user"}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-xl"
            onClick={() => {
              onUnlink();
              onClose();
            }}
          >
            {lang === "my" ? "ချိတ်ဆက်မှု ဖြုတ်ရန်" : "Unlink Telegram"}
          </Button>
        </div>
      )}
    </SettingsBottomSheet>
  );
};

export default TelegramLinkSheet;
