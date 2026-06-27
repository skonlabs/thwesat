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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import {
  useAdminCreatePartner,
  useAdminLinkPartnerUser,
  useAdminUnlinkPartnerUser,
} from "@/hooks/use-partner-finance";

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

  const { data: partnerRoleUsers } = useQuery({
    queryKey: ["admin-partner-role-users"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "partner");
      if (error) throw error;
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (ids.length === 0) return [] as { id: string; display_name: string | null; email: string | null }[];
      const { data: profs, error: pErr } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, email")
        .in("id", ids);
      if (pErr) throw pErr;
      return (profs ?? []) as { id: string; display_name: string | null; email: string | null }[];
    },
  });

  const unlinkedPartnerUsers = (partnerRoleUsers ?? []).filter((u) => !linkedIds.includes(u.id));

  const { data: linkedProfiles } = useQuery({
    queryKey: ["admin-partners-linked-profiles", linkedIds.sort().join(",")],
    enabled: linkedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, email")
        .in("id", linkedIds);
      if (error) throw error;
      const map: Record<string, { display_name: string | null; email: string | null }> = {};
      (data ?? []).forEach((p: any) => (map[p.id] = { display_name: p.display_name, email: p.email }));
      return map;
    },
  });


  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-partners"] });
    qc.invalidateQueries({ queryKey: ["admin-partner-role-users"] });
  };


  return (
    <div className="min-h-dvh bg-background pb-24">
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

        {unlinkedPartnerUsers.length > 0 && (
          <Card className="border-amber-300/60 bg-amber-50/50 p-4 dark:bg-amber-950/20">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              {tt(
                lang,
                "Users with partner role but no partner record",
                "Partner role ရှိပြီး partner record မရှိသူများ",
              )}
            </p>
            <div className="mt-2 space-y-2">
              {unlinkedPartnerUsers.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background/60 p-2">
                  <div className="min-w-0 text-xs">
                    <div className="font-medium text-foreground">{u.display_name ?? "—"}</div>
                    <div className="text-muted-foreground">{u.email ?? u.id.slice(0, 8)}</div>
                  </div>
                  <NewPartnerSheet
                    lang={lang}
                    onDone={refresh}
                    presetUserId={u.id}
                    presetEmail={u.email ?? ""}
                    presetName={u.display_name ?? ""}
                    triggerLabel={tt(lang, "Create partner record", "Partner record ဖန်တီး")}
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

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
                        <UnlinkButton lang={lang} partner={p} onDone={refresh} />
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

        <ReferralCodeUsage lang={lang} />
      </div>
    </div>
  );
};

// ───────────── Referral code usage ─────────────
function ReferralCodeUsage({ lang }: { lang: "en" | "my" }) {
  const [filter, setFilter] = useState<"all" | "used" | "unused">("used");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-partner-referral-usage", filter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("partner_referral_codes")
        .select("id, code, status, used_by, used_at, created_at, partner_id")
        .order("used_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (filter === "used") q = q.eq("status", "used");
      if (filter === "unused") q = q.neq("status", "used");
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string; code: string; status: string; used_by: string | null;
        used_at: string | null; created_at: string; partner_id: string;
      }>;
      const partnerIds = Array.from(new Set(rows.map((r) => r.partner_id)));
      const userIds = Array.from(new Set(rows.map((r) => r.used_by).filter(Boolean) as string[]));
      const [{ data: partners }, profilesRes, rolesRes] = await Promise.all([
        (supabase as any).from("partners").select("id, name, code").in("id", partnerIds),
        userIds.length
          ? (supabase as any).from("profiles").select("id, display_name, email").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? supabase.from("user_roles").select("user_id, role").in("user_id", userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const partnerMap = new Map((partners ?? []).map((p: any) => [p.id, p]));
      const roleMap = new Map(((rolesRes as any).data ?? []).map((r: any) => [r.user_id, r.role]));
      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, { ...p, primary_role: roleMap.get(p.id) ?? null }]));
      return rows.map((r) => ({
        ...r,
        partner: partnerMap.get(r.partner_id) as { name: string; code: string } | undefined,
        profile: r.used_by ? (profileMap.get(r.used_by) as any) : null,
      }));
    },
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{tt(lang, "Referral code usage", "Referral code အသုံးပြုမှု")}</h3>
        <div className="flex gap-1">
          {(["used", "unused", "all"] as const).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? "default" : "outline"}
              onClick={() => setFilter(k)}
              className="h-7 px-2 text-[11px]"
            >
              {tt(lang, k === "used" ? "Redeemed" : k === "unused" ? "Unused" : "All", k === "used" ? "သုံးပြီး" : k === "unused" ? "မသုံးရသေး" : "အားလုံး")}
            </Button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{tt(lang, "Loading…", "ဖွင့်နေသည်…")}</p>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-muted-foreground">{tt(lang, "No codes found.", "Code မရှိပါ။")}</p>
      ) : (
        <div className="divide-y divide-border">
          {data.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{r.code}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{r.partner?.name ?? "—"}</span>
                  {r.partner?.code && <Badge variant="secondary" className="font-mono text-[10px]">{r.partner.code}</Badge>}
                </div>
                {r.profile ? (
                  <div className="mt-0.5 text-muted-foreground">
                    {tt(lang, "Used by", "သုံးသူ")}: <span className="text-foreground">{r.profile.display_name ?? "—"}</span>{" "}
                    <span>({r.profile.email ?? r.used_by?.slice(0, 8)})</span>
                    {r.profile.primary_role && <Badge variant="outline" className="ml-1 text-[10px]">{r.profile.primary_role}</Badge>}
                  </div>
                ) : (
                  <div className="mt-0.5 text-muted-foreground">{tt(lang, "Not redeemed yet", "မသုံးရသေး")}</div>
                )}
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                {r.used_at ? new Date(r.used_at).toLocaleString() : new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ───────────── Unlink button (audited RPC + AlertDialog) ─────────────
function UnlinkButton({ lang, partner, onDone }: { lang: "en" | "my"; partner: PartnerRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const unlink = useAdminUnlinkPartnerUser();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Unlink className="mr-1 h-3.5 w-3.5" />
        {tt(lang, "Unlink", "ဖြုတ်")}
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tt(lang, `Unlink user from ${partner.name}?`, `${partner.name} မှ အသုံးပြုသူကို ဖြုတ်ပါမည်လား?`)}</AlertDialogTitle>
          <AlertDialogDescription>
            {tt(
              lang,
              "The user will lose access to the Partner Portal and cannot mint new referral codes. Existing attributions are preserved. This action is logged.",
              "Partner Portal ဝင်ခွင့် ဆုံးရှုံးပြီး referral code အသစ် ထုတ်၍ မရတော့ပါ။ ရှိပြီး attribution များ ဆက်ရှိနေပါမည်။ ဤလုပ်ဆောင်ချက်ကို မှတ်တမ်းတင်ပါမည်။",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tt(lang, "Cancel", "မလုပ်တော့")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              try {
                await unlink.mutateAsync(partner.id);
                setOpen(false);
                onDone();
              } catch (e: any) {
                toast.error(e.message || "Unlink failed");
              }
            }}
          >
            {tt(lang, "Unlink", "ဖြုတ်")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NewPartnerSheet({
  lang,
  onDone,
  presetUserId,
  presetEmail,
  presetName,
  triggerLabel,
}: {
  lang: "en" | "my";
  onDone: () => void;
  presetUserId?: string;
  presetEmail?: string;
  presetName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(presetName ?? "");
  const [code, setCode] = useState("");
  const [contactEmail, setContactEmail] = useState(presetEmail ?? "");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const create = useAdminCreatePartner();

  const submit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error(tt(lang, "Name and code required", "နာမည်နှင့် ကုဒ် လိုအပ်သည်"));
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        code: code.trim(),
        contact_email: contactEmail.trim() || null,
        contract_start_date: start,
        user_id: presetUserId ?? null,
      });
      setOpen(false);
      setName("");
      setCode("");
      setContactEmail("");
      onDone();
    } catch (e: any) {
      const map: Record<string, string> = {
        duplicate_code: tt(lang, "That code is already taken", "ဤကုဒ်ကို သုံးပြီးဖြစ်နေသည်"),
        invalid_code_format: tt(lang, "Code must be 2–32 chars: A–Z, 0–9, _ or -", "ကုဒ်သည် A–Z, 0–9, _ သို့မဟုတ် - ၂–၃၂ လုံး"),
        user_already_linked_to_partner: tt(lang, "That user is already linked to another partner", "ထိုအသုံးပြုသူသည် အခြား partner နှင့် ချိတ်ပြီးသား"),
        not_authorized: tt(lang, "Admin only", "Admin သာ"),
      };
      toast.error(map[e?.message as string] || e?.message || "Create failed");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant={presetUserId ? "outline" : "default"}>
          <Plus className="mr-1 h-4 w-4" /> {triggerLabel ?? tt(lang, "New partner", "Partner အသစ်")}
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
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ACME_2026" />
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "Contact email", "ဆက်သွယ်ရန် အီးမေးလ်")}</Label>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "Contract start", "စာချုပ် စတင်")}</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <Button onClick={submit} disabled={create.isPending} className="w-full">
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
  const linkRpc = useAdminLinkPartnerUser();

  const search = async () => {
    setFound(null);
    const value = email.trim().toLowerCase();
    if (!value) return;
    setBusy(true);
    try {
      // Use case-insensitive exact match instead of ilike+maybeSingle which throws when
      // duplicate-cased rows exist. Limit to 2 to detect the rare duplicate.
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, email")
        .ilike("email", value)
        .limit(2);
      if (error) throw error;
      const rows = data || [];
      if (rows.length === 0) {
        toast.error(tt(lang, "No user with that email", "အီးမေးလ်နှင့် တူသော အသုံးပြုသူ မရှိ"));
        return;
      }
      if (rows.length > 1) {
        toast.error(tt(lang, "Multiple users match — contact support", "အသုံးပြုသူ တစ်ဦးထက်ပို တွေ့ — support ဆက်သွယ်ပါ"));
        return;
      }
      setFound(rows[0] as any);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    if (!found) return;
    try {
      await linkRpc.mutateAsync({ partner_id: partner.id, user_id: found.id });
      setOpen(false);
      setEmail("");
      setFound(null);
      onDone();
    } catch (e: any) {
      const map: Record<string, string> = {
        user_already_linked_to_partner: tt(lang, "That user is already linked to another partner", "ထိုအသုံးပြုသူသည် အခြား partner နှင့် ချိတ်ပြီးသား"),
        not_authorized: tt(lang, "Admin only", "Admin သာ"),
      };
      toast.error(map[e?.message as string] || e?.message || "Link failed");
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
              <Button onClick={link} disabled={linkRpc.isPending} className="mt-3 w-full" size="sm">
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
