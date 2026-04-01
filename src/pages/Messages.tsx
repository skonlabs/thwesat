import { motion } from "framer-motion";
import { Search, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useConversations } from "@/hooks/use-messages-data";
import PageHeader from "@/components/PageHeader";

const Messages = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: conversations = [], isLoading } = useConversations();

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "မက်ဆေ့ချ်များ" : "Messages"} />
      <div className="px-5">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] text-emerald">
          <Lock className="h-3 w-3" strokeWidth={1.5} />
          <span>{lang === "my" ? "စာများကို ကုဒ်ဝှက်ထားပါသည်" : "End-to-end encrypted"}</span>
        </div>
        <div className="mb-4 mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input placeholder={lang === "my" ? "မက်ဆေ့ချ် ရှာဖွေရန်..." : "Search messages..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center px-5">
          <Lock className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "မက်ဆေ့ချ် မရှိသေးပါ" : "No messages yet"}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map((conv: any, i: number) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/messages/chat?id=${conv.id}`)}
              className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-all active:bg-muted/30"
            >
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {conv.otherProfile?.display_name?.slice(0, 2).toUpperCase() || "?"}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{conv.otherProfile?.display_name || "User"}</h3>
                  <span className="text-[10px] text-muted-foreground">{formatTime(conv.lastMessage?.created_at)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{conv.otherProfile?.headline || ""}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{conv.lastMessage?.content || ""}</p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="mt-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{conv.unreadCount}</span>
              )}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
