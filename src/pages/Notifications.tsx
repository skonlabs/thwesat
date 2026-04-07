import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Briefcase, Users, MessageCircle, Star, Shield, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications-data";

const typeIcons: Record<string, typeof Briefcase> = {
  job: Briefcase,
  application: CheckCircle,
  mentor: Users,
  message: MessageCircle,
  guide: Shield,
  premium: Star,
  payment_approved: CheckCircle,
  payment_rejected: Shield,
  referral_reward: Star,
  system: Bell,
};

const typeColors: Record<string, string> = {
  job: "bg-primary/10 text-primary",
  application: "bg-emerald/10 text-emerald",
  mentor: "bg-gold/10 text-gold-dark",
  message: "bg-accent/10 text-accent",
  guide: "bg-secondary text-secondary-foreground",
  premium: "bg-primary/10 text-primary",
  payment_approved: "bg-emerald/10 text-emerald",
  payment_rejected: "bg-destructive/10 text-destructive",
  referral_reward: "bg-gold/10 text-gold-dark",
  system: "bg-muted text-muted-foreground",
};

function formatTimeAgo(dateStr: string | null, lang: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return lang === "my" ? `${mins} မိနစ်` : `${mins} min`;
  if (hours < 24) return lang === "my" ? `${hours} နာရီ` : `${hours} hr`;
  return lang === "my" ? `${days} ရက်` : `${days} day`;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifs = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;

  const handleClick = (notif: typeof notifications[0]) => {
    if (!notif.is_read) {
      markRead.mutate(notif.id);
    }
    if (notif.link_path) navigate(notif.link_path);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အကြောင်းကြားချက်" : "Notifications"} />

      <div className="px-5">
        <div className="mb-4 flex gap-2">
          <button onClick={() => setFilter("all")} className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
            {lang === "my" ? "အားလုံး" : "All"}
          </button>
          <button onClick={() => setFilter("unread")} className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${filter === "unread" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
            {lang === "my" ? `မဖတ်ရသေး (${unreadCount})` : `Unread (${unreadCount})`}
          </button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center px-5">
            <Bell className="mb-3 h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">
              {filter === "unread"
                ? (lang === "my" ? "မဖတ်ရသေးသော အကြောင်းကြားချက် မရှိပါ" : "No unread notifications")
                : (lang === "my" ? "အကြောင်းကြားချက် မရှိသေးပါ" : "No notifications yet")}
            </p>
          </div>
        ) : (
          filteredNotifs.map((notif, i) => {
            const IconComp = typeIcons[notif.notification_type] || Bell;
            const colorClass = typeColors[notif.notification_type] || "bg-muted text-muted-foreground";
            return (
              <motion.button
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleClick(notif)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-all active:bg-muted/30 ${!notif.is_read ? "bg-primary/[0.03]" : ""}`}
              >
                <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                  <IconComp className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm leading-snug ${!notif.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                      {lang === "my" && notif.title_my ? notif.title_my : notif.title}
                    </h3>
                    {!notif.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {lang === "my" && notif.description_my ? notif.description_my : notif.description}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">{formatTimeAgo(notif.created_at, lang)} {lang === "my" ? "အကြာ" : "ago"}</p>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
