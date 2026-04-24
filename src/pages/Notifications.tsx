import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Bell, Briefcase, Users, MessageCircle, Star, Shield, CheckCircle, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-notifications-data";
import ListSkeleton from "@/components/ListSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
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
  comment_report: "bg-destructive/10 text-destructive",
};

/** Human-readable group label for a notification type. */
const typeGroupLabel = (type: string, lang: string): string => {
  const labels: Record<string, { en: string; my: string }> = {
    job:              { en: "Jobs",         my: "အလုပ်အကိုင်" },
    application:      { en: "Applications", my: "လျှောက်လွှာများ" },
    mentor:           { en: "Mentors",      my: "Mentor" },
    message:          { en: "Messages",     my: "မက်ဆေ့ချ်" },
    guide:            { en: "Guides",       my: "လမ်းညွှန်" },
    premium:          { en: "Premium",      my: "Premium" },
    payment_approved: { en: "Payments",     my: "ငွေပေးချေမှု" },
    payment_rejected: { en: "Payments",     my: "ငွေပေးချေမှု" },
    referral_reward:  { en: "Rewards",      my: "ဆုကြေး" },
    system:           { en: "System",       my: "System" },
    comment_report:   { en: "Moderation",   my: "စစ်ဆေးရေး" },
    moderation:       { en: "Moderation",   my: "စစ်ဆေးရေး" },
  };
  return lang === "my" ? (labels[type]?.my ?? "System") : (labels[type]?.en ?? "System");
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Persist filter tab in URL query param so it survives navigation.
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const filter: "all" | "unread" = filterParam === "unread" ? "unread" : "all";
  const setFilter = (f: "all" | "unread") => {
    setSearchParams(f === "unread" ? { filter: "unread" } : {}, { replace: true });
  };

  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Issue #40: email notification preference — load from user_settings first, fall back to localStorage
  const [emailNotifications, setEmailNotifications] = useState<boolean>(() => {
    return localStorage.getItem("email_notifications_enabled") !== "false";
  });

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("user_settings" as any)
      .select("email_notifications")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof (data as any).email_notifications === "boolean") {
          setEmailNotifications((data as any).email_notifications);
        }
      });
  }, [user?.id]);

  const handleEmailNotificationToggle = async () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);
    localStorage.setItem("email_notifications_enabled", String(newValue));
    if (user?.id) {
      await supabase
        .from("user_settings" as any)
        .upsert({ user_id: user.id, email_notifications: newValue } as any);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifs = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;

  const handleClick = (notif: typeof notifications[0]) => {
    if (!notif.is_read) {
      markRead.mutate(notif.id);
    }
    if (notif.link_path) navigate(notif.link_path);
  };

  const handleDeleteNotification = async (notifId: string) => {
    setDeletingId(notifId);
    const { error } = await supabase.from("notifications").delete().eq("id", notifId);
    setDeletingId(null);
    if (error) {
      toast.error(lang === "my"
        ? "အကြောင်းကြားချက် ဖျက်၍ မရပါ။ ထပ်မံ ကြိုးစားပါ။"
        : "Failed to delete notification. Please try again.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    setShowDeleteAllDialog(false);
  };

  // Group notifications by type for section headers.
  // A section header is shown whenever >= 1 notifications share the same type.
  const groupedSections = (() => {
    const typeOrder: string[] = [];
    const groups: Record<string, typeof filteredNotifs> = {};
    for (const n of filteredNotifs) {
      const t = n.notification_type;
      if (!groups[t]) {
        groups[t] = [];
        typeOrder.push(t);
      }
      groups[t].push(n);
    }
    return typeOrder.map(t => ({ type: t, items: groups[t] }));
  })();

  // Show section headers only when there are multiple distinct types.
  const showGroupHeaders = groupedSections.length > 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အကြောင်းကြားချက်" : "Notifications"} showBack />

      <div className="px-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
            >
              {lang === "my" ? "အားလုံး" : "All"}
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${filter === "unread" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
            >
              {lang === "my" ? `မဖတ်ရသေး (${unreadCount})` : `Unread (${unreadCount})`}
            </button>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate(undefined, {
                  onError: () => {
                    toast.error(lang === "my"
                      ? "အကြောင်းကြားချက်များကို ဖတ်ပြီးအဖြစ် မမှတ်နိုင်ပါ။"
                      : "Failed to mark notifications as read.");
                  },
                })}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-primary disabled:opacity-50"
              >
                {lang === "my" ? "အားလုံးဖတ်ပြီး" : "Mark all read"}
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={() => setShowDeleteAllDialog(true)} className="text-xs font-medium text-destructive">
                {lang === "my" ? "အားလုံးဖျက်" : "Delete all"}
              </button>
            )}
          </div>
        </div>

        {/* Issue #40: Email notification preference — synced to user_settings */}
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm text-foreground">
              {lang === "my" ? "အီးမေးလ် အကြောင်းကြားချက်" : "Email Notifications"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {lang === "my"
                ? "လျှောက်လွှာ / မက်ဆေ့ / ချိန်းဆိုမှု အတွက် အီးမေးလ် ပို့ပါ"
                : "Email me for applications, messages & bookings"}
            </p>
          </div>
          <button
            onClick={handleEmailNotificationToggle}
            className={`h-6 w-11 rounded-full transition-colors ${emailNotifications ? "bg-primary" : "bg-muted-foreground/30"}`}
            aria-label={lang === "my" ? "အီးမေးလ် အကြောင်းကြားချက် ဖွင့်/ပိတ်" : "Toggle email notifications"}
          >
            <div className={`h-5 w-5 rounded-full bg-card shadow transition-transform ${emailNotifications ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {isLoading ? (
          <ListSkeleton count={6} variant="row" />
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
          groupedSections.map(({ type, items }) => (
            <div key={type}>
              {showGroupHeaders && (
                <div className="bg-muted/50 px-5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {typeGroupLabel(type, lang)}
                  </p>
                </div>
              )}
              {items.map((notif, i) => {
                const IconComp = typeIcons[notif.notification_type] || Bell;
                const colorClass = typeColors[notif.notification_type] || "bg-muted text-muted-foreground";
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`group relative flex w-full items-start gap-3 px-5 py-4 text-left transition-all active:bg-muted/30 ${!notif.is_read ? "bg-primary/[0.03]" : ""}`}
                  >
                    <button className="flex flex-1 items-start gap-3 text-left" onClick={() => handleClick(notif)}>
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
                    </button>
                    {/* Delete individual notification — visible on hover */}
                    <button
                      onClick={() => handleDeleteNotification(notif.id)}
                      disabled={deletingId === notif.id}
                      className="mt-1 flex-shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:bg-muted disabled:opacity-50"
                      aria-label={lang === "my" ? "ဖျက်ရန်" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Delete All Confirmation */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "my" ? "အကြောင်းကြားချက်အားလုံး ဖျက်မည်လား?" : "Delete all notifications?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "my" ? "ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍ မရပါ။" : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAll}
            >
              {lang === "my" ? "အားလုံးဖျက်" : "Delete all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;
