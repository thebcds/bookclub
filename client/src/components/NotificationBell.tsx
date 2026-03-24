import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, Trash2, Trophy, Vote, Swords, Info } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";

function formatDistanceToNow(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const typeIcons: Record<string, typeof Bell> = {
  voting_open: Vote,
  voting_reminder: Bell,
  new_round: Swords,
  winner_selected: Trophy,
  tournament_champion: Trophy,
};

const typeColors: Record<string, string> = {
  voting_open: "text-blue-500",
  voting_reminder: "text-orange-500",
  new_round: "text-amber-500",
  winner_selected: "text-emerald-500",
  tournament_champion: "text-yellow-500",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; direction: "up" | "down" }>({ top: 0, left: 0, direction: "up" });

  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: notifications = [] } = trpc.notifications.list.useQuery(
    { limit: 30 },
    { enabled: open }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  const removeNotif = trpc.notifications.remove.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 384; // max-h-96 = 24rem = 384px
    const dropdownWidth = 320; // w-80 = 20rem = 320px
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Prefer opening upward from sidebar footer, but open downward if not enough space
    if (spaceAbove >= dropdownHeight || spaceAbove > spaceBelow) {
      // Open upward
      setDropdownPos({
        top: rect.top - Math.min(dropdownHeight, spaceAbove - 8),
        left: Math.min(rect.right - dropdownWidth, Math.max(8, rect.left)),
        direction: "up",
      });
    } else {
      // Open downward
      setDropdownPos({
        top: rect.bottom + 4,
        left: Math.min(rect.right - dropdownWidth, Math.max(8, rect.left)),
        direction: "down",
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    // Recalculate on scroll/resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleNotificationClick(n: (typeof notifications)[0]) {
    if (!n.isRead) markRead.mutate({ notificationId: n.id });
    if (n.eventId) {
      setLocation(`/events/${n.eventId}`);
      setOpen(false);
    }
  }

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-80 max-h-96 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl flex flex-col animate-in fade-in-0 zoom-in-95"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 9999,
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcons[n.type] || Info;
                const iconColor = typeColors[n.type] || "text-muted-foreground";
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors border-b last:border-b-0 ${
                      !n.isRead ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!n.isRead ? "font-semibold" : "font-normal"}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead.mutate({ notificationId: n.id });
                          }}
                          className="p-1 rounded hover:bg-accent transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotif.mutate({ notificationId: n.id });
                        }}
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors focus:outline-none"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {dropdown}
    </>
  );
}
