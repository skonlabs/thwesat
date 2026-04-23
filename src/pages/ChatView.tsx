import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Lock, Send, Phone, Video, Languages, Loader2, CheckCircle, MessageSquare } from "lucide-react";
import PageHeader from "@/components/PageHeader";
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
  const didInitialScroll = useRef(false);
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
    if (!messages.length) return;
    // First paint: jump instantly to the bottom so the user lands at the latest message
    // without watching a smooth scroll animation. Subsequent updates animate gently.
    bottomRef.current?.scrollIntoView({ behavior: didInitialScroll.current ? "smooth" : "auto" });
    didInitialScroll.current = true;
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
    toast({
      title: lang === "my" ? "မကြာမီ ရရှိပါမည်" : "Coming soon",
      description: type === "audio"
        ? (lang === "my" ? "အသံခေါ်ဆိုမှု လုပ်ဆောင်ချက်ကို ဖန်တီးနေပါသည်" : "Audio calls are not yet available")
        : (lang === "my" ? "ဗီဒီယို ခေါ်ဆိုမှု လုပ်ဆောင်ချက်ကို ဖန်တီးနေပါသည်" : "Video calls are not yet available"),
    });
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
      <PageHeader title={otherProfile?.display_name || (lang === "my" ? "မက်ဆေ့ချ်" : "Chat")} backPath="/messages" />
      <div className="border-b border-border bg-card px-5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">
              {otherProfile?.display_name?.slice(0, 2).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{otherProfile?.display_name || "User"}</h3>
              <div className="flex items-center gap-1">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{lang === "my" ? "ပုဂ္ဂိုလ်ရေး စကားဝိုင်း" : "Private chat"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => handleCall("audio")} className="rounded-lg p-2 text-muted-foreground active:bg-muted"><Phone className="h-5 w-5" strokeWidth={1.5} /></button>
            <button onClick={() => handleCall("video")} className="rounded-lg p-2 text-muted-foreground active:bg-muted"><Video className="h-5 w-5" strokeWidth={1.5} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">{lang === "my" ? "🔒 စကားဝိုင်းသည် ပါဝင်သူနှစ်ဦးတည်းအတွက်သာ မြင်နိုင်ပါသည်" : "🔒 Visible only to you and the other participant"}</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-foreground">
              {lang === "my" ? "စကားစ ပြောကြည့်ပါ" : "Say hello"}
            </p>
            <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
              {lang === "my"
                ? "အောက်တွင် မက်ဆေ့ချ် ရိုက်ထည့်ပြီး စကားဝိုင်း စတင်ပါ။"
                : "Type your first message below to start the conversation."}
            </p>
          </div>
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
        <div className="flex items-end gap-2">
          <div className="flex flex-1 items-center rounded-2xl border border-border bg-background px-4 py-2">
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={lang === "my" ? "မက်ဆေ့ချ် ရေးရန်... (Shift+Enter = new line)" : "Type a message... (Shift+Enter for new line)"}
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-32"
            />
          </div>
          <button onClick={handleSend} disabled={!messageText.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground active:bg-primary/90 disabled:opacity-40">
            <Send className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <Sheet open={!!pickerForMsgId} onOpenChange={(o) => !o && setPickerForMsgId(null)}>
        <SheetContent side="bottom" className="bottom-16 max-h-[75vh] rounded-t-3xl border-t-0 px-5 pb-6 pt-5">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
          <SheetHeader className="mb-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
                <Languages className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <div className="text-left">
                <SheetTitle className="text-base font-bold leading-tight">
                  {lang === "my" ? "ဘာသာပြန်ရန်" : "Translate to"}
                </SheetTitle>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "my" ? "ဘာသာစကား ရွေးချယ်ပါ" : "Choose a language"}
                </p>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-3 gap-1.5 overflow-y-auto pb-2 sm:grid-cols-4">
            {TRANSLATE_LANGUAGES.map((l) => {
              const msg = messages.find((m: any) => m.id === pickerForMsgId);
              const activeLang = pickerForMsgId ? translations[pickerForMsgId]?.lang : null;
              const isActive = activeLang === l.code;
              const native = l.label.includes("(") ? l.label.split("(")[0].trim() : l.label;
              return (
                <button
                  key={l.code}
                  onClick={() => msg && handleTranslateMessage(msg.id, msg.content, l.code)}
                  className={`relative flex min-w-0 flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all active:scale-[0.97] ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-navy"
                      : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  {isActive && (
                    <CheckCircle className="absolute right-1 top-1 h-3 w-3 text-accent" strokeWidth={2.5} />
                  )}
                  <span className="text-xl leading-none">{l.flag}</span>
                  <span className={`block w-full truncate text-[11px] font-semibold leading-tight ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                    {native}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ChatView;
