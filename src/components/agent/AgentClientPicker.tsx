import { Building2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAgentClients, type AgentClient } from "@/hooks/use-agent-clients";
import { useLanguage } from "@/hooks/use-language";

interface Props {
  /** 'self' = post under agent's identity. 'client' = post under selected client. */
  postedByLabel: "self" | "client";
  onPostedByLabelChange: (v: "self" | "client") => void;
  selectedClientId: string | null;
  onSelectClient: (client: AgentClient | null) => void;
}

export default function AgentClientPicker({
  postedByLabel,
  onPostedByLabelChange,
  selectedClientId,
  onSelectClient,
}: Props) {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useAgentClients();

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {lang === "my" ? "မည်သူ့ ကိုယ်စား တင်မည်" : "Posting on behalf of"}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {lang === "my"
              ? "အလုပ်ရှာသူများ ဘယ်အမည်/လိုဂို မြင်ရမည် ရွေးပါ"
              : "Choose whose name & logo job seekers will see"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/agent/clients")}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] text-foreground active:bg-muted"
        >
          {lang === "my" ? "စီမံ" : "Manage"} <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onPostedByLabelChange("self");
            onSelectClient(null);
          }}
          className={`rounded-xl border p-3 text-left transition-colors ${
            postedByLabel === "self"
              ? "border-primary bg-primary/5"
              : "border-border"
          }`}
        >
          <p className="text-xs font-semibold text-foreground">
            {lang === "my" ? "ကျွန်ုပ် (အေဂျင့်)" : "My agency"}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {lang === "my" ? "ကျွန်ုပ်၏ အမည်ဖြင့်" : "Show your agency name"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => onPostedByLabelChange("client")}
          className={`rounded-xl border p-3 text-left transition-colors ${
            postedByLabel === "client"
              ? "border-primary bg-primary/5"
              : "border-border"
          }`}
        >
          <p className="text-xs font-semibold text-foreground">
            {lang === "my" ? "ကုမ္ပဏီ ကိုယ်စား" : "Client company"}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {lang === "my" ? "ကုမ္ပဏီ အမည်/လိုဂို ပြ" : "Show client's name & logo"}
          </p>
        </button>
      </div>

      {postedByLabel === "client" && (
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-[11px] text-muted-foreground">
              {lang === "my" ? "ဖွင့်နေသည်..." : "Loading..."}
            </p>
          ) : clients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-center">
              <p className="text-[11px] text-muted-foreground">
                {lang === "my"
                  ? "ကုမ္ပဏီ မရှိသေးပါ"
                  : "You don't have any saved clients yet."}
              </p>
              <button
                type="button"
                onClick={() => navigate("/agent/clients")}
                className="mt-1 text-[11px] font-semibold text-primary underline"
              >
                {lang === "my" ? "ကုမ္ပဏီ ထည့်ရန်" : "Add a client"}
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {clients.map((c) => {
                const active = c.id === selectedClientId;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => onSelectClient(c)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                      active ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2
                          className="h-4 w-4 text-muted-foreground"
                          strokeWidth={1.5}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {c.name}
                      </p>
                      {c.industry && (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {c.industry}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
