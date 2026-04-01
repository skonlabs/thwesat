import { useState } from "react";
import { Key, Copy, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import SettingsBottomSheet from "./SettingsBottomSheet";

interface DelegateTokenSheetProps {
  open: boolean;
  onClose: () => void;
  token: string | null;
  onGenerate: () => void;
  onRevoke: () => void;
}

const DelegateTokenSheet = ({ open, onClose, token, onGenerate, onRevoke }: DelegateTokenSheetProps) => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);

  const handleCopy = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <SettingsBottomSheet
      open={open}
      onClose={onClose}
      title={lang === "my" ? "Delegate Access Token" : "Delegate Access Token"}
    >
      <p className="mb-4 text-xs text-muted-foreground">
        {lang === "my"
          ? "ယုံကြည်ရသူကို သင့်အကောင့်ကိုယ်စား လုပ်ဆောင်ခွင့်ပေးရန် Token ဖန်တီးပါ"
          : "Generate a token to allow a trusted person to act on your behalf"}
      </p>

      {!token ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Key className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {lang === "my"
                ? "Token မသတ်မှတ်ရသေးပါ"
                : "No token has been generated yet"}
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.5} />
            <p className="text-[11px] text-foreground/80">
              {lang === "my"
                ? "Token ကိုင်ဆောင်သူသည် သင့်အကောင့်ကိုယ်စား လုပ်ဆောင်နိုင်ပါသည်။ ယုံကြည်ရသူကိုသာ မျှဝေပါ။"
                : "Anyone with this token can act on your behalf. Only share with people you trust."}
            </p>
          </div>
          <Button variant="default" size="lg" className="w-full rounded-xl" onClick={onGenerate}>
            {lang === "my" ? "Token ဖန်တီးမည်" : "Generate Token"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
              {lang === "my" ? "သင့် Token" : "Your Token"}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card px-3 py-2.5">
                <p className="truncate font-mono text-xs text-foreground">{token}</p>
              </div>
              <button onClick={handleCopy} className="rounded-lg border border-border bg-card p-2.5 active:bg-muted">
                {copied
                  ? <Check className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  : <Copy className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                }
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.5} />
            <p className="text-[11px] text-foreground/80">
              {lang === "my"
                ? "ဤ Token ကို လုံခြုံစွာ သိမ်းဆည်းပါ။ ထပ်မံ ကြည့်၍ မရပါ။"
                : "Store this token securely. You won't be able to view it again."}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1 rounded-xl gap-2" onClick={onGenerate}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
              {lang === "my" ? "အသစ်ဖန်တီး" : "Regenerate"}
            </Button>
            {!showRevoke ? (
              <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setShowRevoke(true)}>
                {lang === "my" ? "ဖျက်သိမ်းမည်" : "Revoke"}
              </Button>
            ) : (
              <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => { onRevoke(); setShowRevoke(false); onClose(); }}>
                {lang === "my" ? "သေချာပါသလား?" : "Are you sure?"}
              </Button>
            )}
          </div>
        </div>
      )}
    </SettingsBottomSheet>
  );
};

export default DelegateTokenSheet;
