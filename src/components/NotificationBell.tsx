import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllRead, type Notification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";

const severityConfig: Record<string, { icon: typeof Info; color: string }> = {
  error: { icon: AlertTriangle, color: "text-destructive" },
  success: { icon: CheckCircle, color: "text-success" },
  warning: { icon: AlertTriangle, color: "text-warning" },
  info: { icon: Info, color: "text-primary" },
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: notifications = [] } = useNotifications();
  const unreadCount = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.pipeline_id) {
      navigate(`/pipelines/${n.pipeline_id}`);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-xs font-display font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button
                onClick={() => { setOpen(false); navigate("/alerts"); }}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                View all
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => {
                const cfg = severityConfig[n.severity] ?? severityConfig.info;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium truncate", n.read ? "text-muted-foreground" : "text-foreground")}>
                          {n.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
