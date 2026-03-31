import { ArrowLeft, Lock, Send, Phone, Video, MoreVertical, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";

const messages = [
  { id: 1, sender: "them", text: "မင်္ဂလာပါ! ပရိုဖိုင်ကို ကြည့်ပြီးပါပြီ", time: "10:30 AM" },
  { id: 2, sender: "them", text: "React experience ကောင်းပါတယ်။ Portfolio website ရှိရင် ပိုကောင်းပါမယ်", time: "10:31 AM" },
  { id: 3, sender: "me", text: "ကျေးဇူးတင်ပါတယ် ဆရာမ! Portfolio ပြင်ဆင်နေပါတယ်", time: "10:45 AM" },
  { id: 4, sender: "me", text: "Vercel မှာ deploy လုပ်ပြီးရင် link ပို့ပေးပါမယ်", time: "10:45 AM" },
  { id: 5, sender: "them", text: "ကောင်းပါတယ်! Upwork profile လည်း ပြင်ဆင်ပြီးရင် ကျွန်မ review လုပ်ပေးပါမယ်", time: "11:00 AM" },
  { id: 6, sender: "them", text: "ပရိုဖိုင်ကို ကြည့်ပြီးပါပြီ။ ကောင်းပါတယ်! 👍", time: "11:02 AM" },
];

const ChatView = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Chat header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/messages")} className="text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-primary-foreground">
                  KM
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">ဒေါ်ခင်မြတ်နိုး</h3>
                <div className="flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5 text-emerald" />
                  <span className="text-[10px] text-emerald">Encrypted</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-muted-foreground"><Phone className="h-4.5 w-4.5" /></button>
            <button className="text-muted-foreground"><Video className="h-4.5 w-4.5" /></button>
            <button className="text-muted-foreground"><MoreVertical className="h-4.5 w-4.5" /></button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
            🔒 Messages are end-to-end encrypted · စာများကို ကုဒ်ဝှက်ထားပါသည်
          </span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                msg.sender === "me"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-card text-foreground shadow-card"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p className={`mt-1 text-right text-[9px] ${msg.sender === "me" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3 pb-safe">
        <div className="flex items-center gap-2">
          <button className="text-muted-foreground"><Paperclip className="h-5 w-5" /></button>
          <div className="flex flex-1 items-center rounded-full bg-muted px-4 py-2.5">
            <input
              placeholder="မက်ဆေ့ချ် ရေးရန်..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
