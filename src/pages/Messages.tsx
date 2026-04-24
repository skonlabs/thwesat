import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Lock, Users, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useConversations } from "@/hooks/use-messages-data";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import ListSkeleton from "@/components/ListSkeleton";

const Messages = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { role } = useRole();
  const { data: conversations = [], isLoading } = useConversations();
  const [search, setSearch] = useState("");

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return lang === "my" ? `${mins}မိ` : `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return lang === "my" ? `${hrs}န` : `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return lang === "my" ? `${days}ရ` : `${days}d`;
  };

  const filtered = conversations.filter((conv: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (conv.otherProfile?.display_name || "").toLowerCase().includes(q) ||
      (conv.otherProfile?.headline || "").toLowerCase().includes(q) ||
      (conv.lastMessage?.content || "").toLowerCase().includes(q)
    );
  });

  const discoverPath = role === "employer" ? "/employer/search" : "/mentors";
  const discoverLabel = role === "employer"
    ? (lang === "my" ? "ဝန်ထမ်းရှာဖွေရန်" : "Find Talent")
    : (lang === "my" ? "Mentor ရှာဖွေရန်" : "Find Mentors");
  const DiscoverIcon = role === "employer" ? Briefcase : Users;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "မက်ဆေ့ချ်များ" : "Messages"} />
      <div className="px-5">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Lock className="h-3 w-3" strokeWidth={1.5} />
          <span>{lang === "my" ? "ပုဂ္ဂိုလ်ရေး စကားဝိုင်း" : "Private conversations"}</span>
        </div>
        <div className="mb-4 mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "my" ? "မက်ဆေ့ချ် ရှာဖွေရန်..." : "Search messages..."}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton count={6} variant="row" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center px-5">
          <Lock className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm font-medium text-muted-foreground">
            {conversations.length === 0
              ? (lang === "my" ? "မက်ဆေ့ချ် မရှိသေးပါ" : "No messages yet")
              : (lang === "my" ? "ရလဒ် မတွေ့ပါ" : "No matches")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {conversations.length === 0
              ? (lang === "my" ? "အလုပ်ကြော်ငြာဖော်ပြသူ သို့မဟုတ် Mentor ကို မက်ဆေ့ချ်ပို့ပြီး စကားဝိုင်း စတင်ပါ" : "Start a conversation by messaging a job poster or mentor.")
              : (lang === "my" ? "အခြားစကားလုံးဖြင့် ပြန်ရှာကြည့်ပါ" : "Try a different search term")}
          </p>
          {conversations.length === 0 && (
            <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate(discoverPath)}>
              <DiscoverIcon className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> {discoverLabel}
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((conv: any, i: number) => (
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
                  <h3 className="text-sm font-semibold text-foreground">{conv.otherProfile?.display_name || (lang === "my" ? "အသုံးပြုသူ" : "User")}</h3>
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
