import { ArrowLeft, Lock, Send, Phone, Video, MoreVertical, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

const messages = [
  { id: 1, sender: "them", text: { my: "မင်္ဂလာပါ! ပရိုဖိုင်ကို ကြည့်ပြီးပါပြီ", en: "Hello! I've reviewed your profile" }, time: "10:30 AM" },
  { id: 2, sender: "them", text: { my: "React experience ကောင်းပါတယ်။ Portfolio website ရှိရင် ပိုကောင်းပါမယ်", en: "Your React experience is great. A portfolio website would be even better" }, time: "10:31 AM" },
  { id: 3, sender: "me", text: { my: "ကျေးဇူးတင်ပါတယ် ဆရာမ! Portfolio ပြင်ဆင်နေပါတယ်", en: "Thank you! I'm working on my portfolio" }, time: "10:45 AM" },
  { id: 4, sender: "me", text: { my: "Vercel မှာ deploy လုပ်ပြီးရင် link ပို့ပေးပါမယ်", en: "I'll send the link once I deploy on Vercel" }, time: "10:45 AM" },
  { id: 5, sender: "them", text: { my: "ကောင်းပါတယ်! Upwork profile လည်း ပြင်ဆင်ပြီးရင် ကျွန်မ review လုပ်ပေးပါမယ်", en: "Great! I can also review your Upwork profile when it's ready" }, time: "11:00 AM" },
  { id: 6, sender: "them", text: { my: "ပရိုဖိုင်ကို ကြည့်ပြီးပါပြီ။ ကောင်းပါတယ်! 👍", en: "Reviewed your profile. Looks good! 👍" }, time: "11:02 AM" },
];

const ChatView = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();

  const handleCall = (type: "audio" | "video") => {
    toast({
      title: lang === "my" ? "မကြာမီ ရရှိနိုင်ပါမည်" : "Coming soon",
      description: lang === "my" ? `${type === "audio" ? "အသံ" : "ဗီဒီယို"} ခေါ်ဆိုမှု မကြာမီ ရရှိနိုင်ပါမည်` : `${type === "audio" ? "Voice" : "Video"} calling coming soon`,
    });
  };

  const handleAttach = () => {
    toast({
      title: lang === "my" ? "ဖိုင်ပူးတွဲရန်" : "Attach file",
      description: lang === "my" ? "မကြာမီ ရရှိနိုင်ပါမည်" : "Coming soon",
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/messages")} className="rounded-lg p-1 text-foreground active:bg-muted">
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">KM</div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "ဒေါ်ခင်မြတ်နိုး" : "Khin Myat Noe"}</h3>
                <div className="flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5 text-emerald" />
                  <span className="text-[10px] text-emerald">{lang === "my" ? "ကုဒ်ဝှက်ထား" : "Encrypted"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handleCall("audio")} className="rounded-lg p-2 text-muted-foreground active:bg-muted">
              <Phone className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button onClick={() => handleCall("video")} className="rounded-lg p-2 text-muted-foreground active:bg-muted">
              <Video className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button className="rounded-lg p-2 text-muted-foreground active:bg-muted">
              <MoreVertical className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
            🔒 {lang === "my" ? "စာများကို ကုဒ်ဝှက်ထားပါသည်" : "Messages are end-to-end encrypted"}
          </span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${msg.sender === "me" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card text-foreground"}`}>
              <p className="text-sm leading-relaxed">{lang === "my" ? msg.text.my : msg.text.en}</p>
              <p className={`mt-1 text-right text-[9px] ${msg.sender === "me" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border bg-card px-4 py-3 pb-safe">
        <div className="flex items-center gap-2">
          <button onClick={handleAttach} className="rounded-lg p-2 text-muted-foreground active:bg-muted">
            <Paperclip className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div className="flex flex-1 items-center rounded-full border border-border bg-background px-4 py-2.5">
            <input placeholder={lang === "my" ? "မက်ဆေ့ချ် ရေးရန်..." : "Type a message..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground active:bg-primary/90">
            <Send className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
