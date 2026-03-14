import { useEffect, useState } from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CountdownTimerProps {
  deadline: Date | string;
  label: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

function getTimeRemaining(deadline: Date) {
  const now = new Date().getTime();
  const target = deadline.getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { expired: false, days, hours, minutes, seconds, totalMs: diff };
}

export default function CountdownTimer({ deadline, label, compact = false }: CountdownTimerProps) {
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const [time, setTime] = useState(() => getTimeRemaining(deadlineDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(deadlineDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadlineDate.getTime()]);

  if (time.expired) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          {label} ended
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 px-4 py-2.5">
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label} deadline has passed</span>
      </div>
    );
  }

  const isUrgent = time.totalMs < 1000 * 60 * 60 * 24; // Less than 24 hours

  if (compact) {
    const parts: string[] = [];
    if (time.days > 0) parts.push(`${time.days}d`);
    if (time.hours > 0) parts.push(`${time.hours}h`);
    if (time.minutes > 0) parts.push(`${time.minutes}m`);
    if (time.days === 0) parts.push(`${time.seconds}s`);

    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
        <Clock className="h-3 w-3" />
        {parts.join(" ")} left
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${isUrgent ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
      {isUrgent ? (
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
      ) : (
        <Clock className="h-4 w-4 text-primary shrink-0" />
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{label}:</span>
        <div className="flex items-center gap-1 font-mono text-sm">
          {time.days > 0 && (
            <>
              <span className={`font-bold ${isUrgent ? "text-destructive" : "text-primary"}`}>{time.days}</span>
              <span className="text-muted-foreground text-xs">d</span>
            </>
          )}
          <span className={`font-bold ${isUrgent ? "text-destructive" : "text-primary"}`}>
            {String(time.hours).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground text-xs">h</span>
          <span className={`font-bold ${isUrgent ? "text-destructive" : "text-primary"}`}>
            {String(time.minutes).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground text-xs">m</span>
          <span className={`font-bold ${isUrgent ? "text-destructive" : "text-primary"}`}>
            {String(time.seconds).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground text-xs">s</span>
        </div>
      </div>
    </div>
  );
}
