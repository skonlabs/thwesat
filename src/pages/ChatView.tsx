import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Lock, Send, Phone, Video, Languages, Loader2, CheckCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useMessages, useSendMessage } from "@/hooks/use-messages-data";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TRANSLATE_LANGUAGES } from "@/lib/translate-languages";
import { useToast } from "@/hooks/use-toast";

const ChatView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("id") || undefined;
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  // Per-message translation state
  const [translations, setTranslations] = useState<Record<string, { lang: string; text: string }>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [pickerForMsgId, setPickerForMsgId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();

  // Get other participant profile
  const { data: otherProfile } = useQuery({
    queryKey: ["chat-other-profile", conversationId],
    queryFn: async () => {
      if (!conversationId || !user) return null;
      const { data: participants } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", conversationId);
      const otherId = (participants || []).find(p => p.user_id !== user.id)?.user_id;
      if (!otherId) return null;
      const { data: profile } = await supabase.from("profiles").select("display_name, headline, avatar_url").eq("id", otherId).maybeSingle();
      return profile;
    },
    enabled: !!conversationId && !!user,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read whenever new messages arrive in this conversation
  useEffect(() => {
    if (!conversationId || !user) return;
    const hasUnread = messages.some((m: any) => !m.is_read && m.sender_id !== user.id);
    if (!hasUnread) return;
    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      });
  }, [conversationId, user, messages, queryClient]);

  const handleSend = () => {
    if (!messageText.trim() || !conversationId) return;
    sendMessage.mutate({ conversationId, content: messageText });
    setMessageText("");
  };

  const handleCall = (type: "audio" | "video") => {
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleTranslateMessage = async (msgId: string, content: string, targetLang: string) => {
    setPickerForMsgId(null);
    const existing = translations[msgId];
    if (existing && existing.lang === targetLang) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      return;
    }
    setTranslatingId(msgId);
    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { content, sourceLang: "auto", targetLang },
      });
      if (error) throw error;
      setTranslations((prev) => ({ ...prev, [msgId]: { lang: targetLang, text: data.translatedContent } }));
    } catch {
      toast({ title: lang === "my" ? "ဘာသာပြန်၍ မရပါ" : "Translation failed", variant: "destructive" });
    } finally {
      setTranslatingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border bg-card px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/messages")} className="rounded-lg p-1 text-foreground active:bg-muted"><ArrowLeft className="h-5 w-5" strokeWidth={1.5} /></button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {otherProfile?.display_name?.slice(0, 2).toUpperCase() || "?"}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{otherProfile?.display_name || "User"}</h3>
                <div className="flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5 text-emerald" />
                  <span className="text-[10px] text-emerald">{lang === "my" ? "ကုဒ်ဝှက်ထား" : "Encrypted"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handleCall("audio")} className="rounded-lg p-2 text-muted-foreground active:bg-muted"><Phone className="h-5 w-5" strokeWidth={1.5} /></button>
            <button onClick={() => handleCall("video")} className="rounded-lg p-2 text-muted-foreground active:bg-muted"><Video className="h-5 w-5" strokeWidth={1.5} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">🔒 {lang === "my" ? "စာများကို ကုဒ်ဝှက်ထားပါသည်" : "Messages are end-to-end encrypted"}</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          messages.map((msg: any) => {
            const isMine = msg.sender_id === user?.id;
            const tr = translations[msg.id];
            const trMeta = tr ? TRANSLATE_LANGUAGES.find(l => l.code === tr.lang) : null;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`group max-w-[80%] rounded-2xl px-3.5 py-2.5 ${isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card text-foreground"}`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  {tr && (
                    <div className={`mt-2 border-t pt-2 ${isMine ? "border-primary-foreground/20" : "border-border"}`}>
                      <p className={`mb-0.5 text-[9px] uppercase tracking-wide ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {trMeta?.flag} {trMeta?.label}
                      </p>
                      <p className={`text-sm leading-relaxed ${isMine ? "text-primary-foreground/90" : "text-foreground/90"}`}>{tr.text}</p>
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setPickerForMsgId(msg.id)}
                      disabled={translatingId === msg.id}
                      className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
                        isMine
                          ? "text-primary-foreground/70 active:bg-primary-foreground/10"
                          : "text-muted-foreground active:bg-muted"
                      }`}
                    >
                      {translatingId === msg.id ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" strokeWidth={2} />
                      ) : (
                        <Languages className="h-2.5 w-2.5" strokeWidth={2} />
                      )}
                      {translatingId === msg.id
                        ? (lang === "my" ? "ဘာသာပြန်နေသည်" : "Translating")
                        : tr
                          ? (lang === "my" ? "ဘာသာစကား ပြောင်း" : "Change language")
                          : (lang === "my" ? "ဘာသာပြန်ရန်" : "Translate")}
                    </button>
                    <p className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-card px-4 py-3 pb-safe">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-full border border-border bg-background px-4 py-2.5">
            <input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSend(); }} placeholder={lang === "my" ? "မက်ဆေ့ချ် ရေးရန်..." : "Type a message..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <button onClick={handleSend} disabled={!messageText.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground active:bg-primary/90 disabled:opacity-40">
            <Send className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
