import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Link2, Unlink, Check } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";

/**
 * Admin · Partner Accounts — manage partner records and link them to user
 * accounts. A partner must be linked to a user before they can sign in to the
 * Partner Portal or mint referral codes.
 */
const tt = (lang: "en" | "my", en: string, my: string) => (lang === "my" ? my : en);

type PartnerRow = {
  id: string;
  name: string;
  code: string;
  user_id: string | null;
  is_active: boolean;
  contact_email: string | null;
  contract_start_date: string;
};

const AdminPartners = () => {
  const { lang } = useLanguage();
  const qc = useQueryClient();

  const { data: partners, isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partners")
        .select("id, name, code, user_id, is_active, contact_email, contract_start_date")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PartnerRow[];
    },
  });

  const linkedIds = (partners ?? []).map((p) => p.user_id).filter(Boolean) as string[];
  const { data: linkedProfiles } = useQuery({
    queryKey: ["admin-partners-linked-profiles", linkedIds.sort().join(",")],
    enabled: linkedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", linkedIds);
      if (error) throw error;
      const map: Record<string, { display_name: string | null; email: string | null }> = {};
      (data ?? []).forEach((p: any) => (map[p.id] = { display_name: p.display_name, email: p.email }));
      return map;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-partners"] });

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={tt(lang, "Partner Accounts", "Partner အကောင့်များ")} showBack />
      <div className="mx-auto max-w-4xl space-y-4 px-5 md:px-8">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {tt(
              lang,
              "Create partners and link them to a user account so they can sign in to the Partner Portal.",
              "Partner ဖန်တီးပြီး Partner Portal ဝင်နိုင်ရန် အသုံးပြုသူ အကောင့်နှင့် ချိတ်ဆက်ပါ။",
            )}
          </p>
          <NewPartnerSheet lang={lang} onDone={refresh} />
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{tt(lang, "Loading…", "ဖွင့်နေသည်…")}</Card>
        ) : !partners || partners.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {tt(lang, "No partners yet.", "Partner မရှိသေးပါ။")}
          </Card>
        ) : (
          <div className="grid gap-3">
            {partners.map((p) => {
              const profile = p.user_id ? linkedProfiles?.[p.user_id] : null;
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                        <Badge variant="outline" className="font-mono text-[10px]">{p.code}</Badge>
                        {!p.is_active && (
                          <Badge variant="secondary" className="text-[10px]">
                            {tt(lang, "Inactive", "မလုပ်ဆောင်")}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {tt(lang, "Contract start", "စာချုပ် စတင်")}: {p.contract_start_date}
                      </p>
                      {p.contact_email && (
                        <p className="text-[11px] text-muted-foreground">{p.contact_email}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-[12px]">
                        {p.user_id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-foreground">
                              {tt(lang, "Linked to", "ချိတ်ဆက်ထား")}: {profile?.display_name ?? "—"}{" "}
                              <span className="text-muted-foreground">({profile?.email ?? p.user_id.slice(0, 8)})</span>
                            </span>
                          </>
                        ) : (
                          <span className="text-amber-600">
                            {tt(lang, "Not linked to any user", "အသုံးပြုသူ မချိတ်ဆက်ရသေး")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {p.user_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const ok = window.confirm(
                              tt(lang, "Unlink this user from partner?", "ဤအသုံးပြုသူကို partner မှ ဖြုတ်ပါမည်လား။"),
                            );
                            if (!ok) return;
                            const { error } = await (supabase as any)
                              .from("partners")
                              .update({ user_id: null })
                              .eq("id", p.id);
                            if (error) {
                              toast.error(error.message);
                              return;
                            }
                            refresh();
                          }}
                        >
                          <Unlink className="mr-1 h-3.5 w-3.5" />
                          {tt(lang, "Unlink", "ဖြုတ်")}
                        </Button>
                      ) : (
                        <LinkUserSheet lang={lang} partner={p} onDone={refresh} />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function NewPartnerSheet({ lang, onDone }: { lang: "en" | "my"; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name || !code) {
      toast.error(tt(lang, "Name and code required", "နာမည်နှင့် ကုဒ် လိုအပ်သည်"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await (supabase as any).from("partners").insert({
        name,
        code,
        contact_email: contactEmail || null,
        contract_start_date: start,
      });
      if (error) throw error;
      setOpen(false);
      setName("");
      setCode("");
      setContactEmail("");
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> {tt(lang, "New partner", "Partner အသစ်")}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{tt(lang, "New partner", "Partner အသစ်")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">{tt(lang, "Name", "နာမည်")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "Code", "ကုဒ်")}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "Contact email", "ဆက်သွယ်ရန် အီးမေးလ်")}</Label>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "Contract start", "စာချုပ် စတင်")}</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <Button onClick={submit} disabled={busy} className="w-full">
            {tt(lang, "Create", "ဖန်တီး")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LinkUserSheet({ lang, partner, onDone }: { lang: "en" | "my"; partner: PartnerRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{ id: string; display_name: string | null; email: string | null } | null>(null);

  const search = async () => {
    setFound(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .ilike("email", email.trim())
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error(tt(lang, "No user with that email", "အီးမေးလ်နှင့် တူသော အသုံးပြုသူ မရှိ"));
        return;
      }
      setFound(data as any);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    if (!found) return;
    setBusy(true);
    try {
      // Ensure this user isn't already linked to another partner
      const { data: existing } = await (supabase as any)
        .from("partners")
        .select("id, name")
        .eq("user_id", found.id)
        .maybeSingle();
      if (existing && existing.id !== partner.id) {
        toast.error(
          tt(lang, `Already linked to ${existing.name}`, `${existing.name} နှင့် ချိတ်ဆက်ပြီးသား`),
        );
        return;
      }
      const { error } = await (supabase as any)
        .from("partners")
        .update({ user_id: found.id })
        .eq("id", partner.id);
      if (error) throw error;
      setOpen(false);
      setEmail("");
      setFound(null);
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 className="mr-1 h-3.5 w-3.5" />
          {tt(lang, "Link user", "အသုံးပြုသူ ချိတ်")}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {tt(lang, `Link user to ${partner.name}`, `${partner.name} နှင့် ချိတ်ဆက်`)}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">{tt(lang, "User email", "အသုံးပြုသူ အီးမေးလ်")}</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="user@example.com"
              />
              <Button onClick={search} disabled={busy} variant="outline">
                {tt(lang, "Find", "ရှာ")}
              </Button>
            </div>
          </div>
          {found && (
            <Card className="p-3">
              <p className="text-sm font-medium">{found.display_name ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">{found.email}</p>
              <Button onClick={link} disabled={busy} className="mt-3 w-full" size="sm">
                <Link2 className="mr-1 h-3.5 w-3.5" />
                {tt(lang, "Link this user", "ဤအသုံးပြုသူ ချိတ်ဆက်")}
              </Button>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AdminPartners;
