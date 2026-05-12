import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  email: z.string().trim().email("Valid email required").max(254),
  category: z.enum(["feedback", "issue", "question", "other"]),
  subject: z.string().trim().min(1, "Subject required").max(200),
  message: z.string().trim().min(10, "Please share a bit more (min 10 chars)").max(4000),
});

const Contact = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const my = lang === "my";

  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name || "",
    email: user?.email || "",
    category: "feedback" as "feedback" | "issue" | "question" | "other",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first || "Please check your inputs");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("contact_messages").insert({
      ...parsed.data,
      user_id: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(my ? "ပို့မရပါ။ ထပ်ကြိုးစားပါ။" : "Could not send. Please try again.");
      return;
    }
    setDone(true);
  };

  const categories: { value: typeof form.category; en: string; my: string }[] = [
    { value: "feedback", en: "Feedback", my: "အကြံပြုချက်" },
    { value: "issue", en: "Report an issue", my: "ပြဿနာ တင်ပြရန်" },
    { value: "question", en: "Ask a question", my: "မေးခွန်း မေးရန်" },
    { value: "other", en: "Other", my: "အခြား" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="ThweSat" width={28} height={28} />
            <span className="font-brand text-lg font-semibold">
              <span className="text-foreground">Thwe</span>
              <span className="text-accent">Sat</span>
            </span>
          </Link>
          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {my ? "အိမ်" : "Home"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {my ? "ဆက်သွယ်ရန်" : "Contact Us"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {my
                ? "အကြံပြုချက်၊ ပြဿနာ သို့ မေးခွန်း ပို့ပေးပါ။"
                : "Send us feedback, report an issue, or ask a question."}
            </p>
          </div>
        </div>

        {done ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold text-foreground">
              {my ? "ကျေးဇူးတင်ပါသည်!" : "Thanks for reaching out!"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {my
                ? "သင့်စာကို လက်ခံရရှိပါပြီ။ မကြာမီ ပြန်လည် ဆက်သွယ်ပါမည်။"
                : "We've received your message and will get back to you soon."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link to="/">{my ? "အိမ်သို့" : "Back home"}</Link>
              </Button>
              <Button onClick={() => { setDone(false); setForm({ ...form, subject: "", message: "" }); }}>
                {my ? "နောက်တစ်စောင် ပို့ရန်" : "Send another"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{my ? "အမည်" : "Name"}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{my ? "အီးမေးလ်" : "Email"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={254}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{my ? "အမျိုးအစား" : "Category"}</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as typeof form.category })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {my ? c.my : c.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subject">{my ? "ခေါင်းစဉ်" : "Subject"}</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message">{my ? "မက်ဆေ့ချ်" : "Message"}</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={6}
                maxLength={4000}
                required
              />
              <p className="text-right text-[11px] text-muted-foreground">{form.message.length}/4000</p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
              {submitting ? (my ? "ပို့နေသည်…" : "Sending…") : my ? "ပို့ရန်" : "Send message"}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              {my ? "သို့မဟုတ် တိုက်ရိုက် " : "Or email us at "}
              <a href="mailto:support@thwesat.com" className="text-primary hover:underline">
                support@thwesat.com
              </a>
            </p>
          </form>
        )}

        <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/privacy-policy" className="hover:text-foreground">
            {my ? "ကိုယ်ရေးကာကွယ်မှု" : "Privacy"}
          </Link>
          <span>·</span>
          <Link to="/terms-of-service" className="hover:text-foreground">
            {my ? "စည်းမျဉ်း" : "Terms"}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Contact;
