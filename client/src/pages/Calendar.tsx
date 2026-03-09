import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import {
  Calendar as CalIcon,
  Download,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function generateICS(events: any[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BookClub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const evt of events) {
    const start = new Date(evt.startDate);
    const end = evt.endDate ? new Date(evt.endDate) : new Date(start.getTime() + 3600000);
    const formatDate = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");

    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART:${formatDate(start)}`);
    lines.push(`DTEND:${formatDate(end)}`);
    lines.push(`SUMMARY:${(evt.title || "").replace(/\n/g, "\\n")}`);
    if (evt.description) {
      lines.push(
        `DESCRIPTION:${(evt.description || "").replace(/\n/g, "\\n")}`
      );
    }
    lines.push(`UID:bookclub-${evt.id}@bookclub`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadICS(events: any[]) {
  const ics = generateICS(events);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bookclub-calendar.ics";
  a.click();
  URL.revokeObjectURL(url);
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  submission_deadline: "Submission Deadline",
  voting_deadline: "Voting Deadline",
  reading_milestone: "Reading Milestone",
  meeting: "Meeting",
  custom: "Custom",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  submission_deadline: "bg-emerald-100 text-emerald-800",
  voting_deadline: "bg-amber-100 text-amber-800",
  reading_milestone: "bg-blue-100 text-blue-800",
  meeting: "bg-purple-100 text-purple-800",
  custom: "bg-gray-100 text-gray-800",
};

export default function CalendarPage() {
  const { activeGroup, isGroupAdmin } = useGroup();
  const gid = activeGroup?.id ?? 0;
  const { data: calEvents, isLoading } = trpc.calendar.list.useQuery(
    { groupId: gid },
    { enabled: !!activeGroup }
  );
  const [showAdd, setShowAdd] = useState(false);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => {
      toast.success("Event deleted");
      utils.calendar.list.invalidate({ groupId: gid });
      utils.calendar.upcoming.invalidate({ groupId: gid });
    },
    onError: (err) => toast.error(err.message),
  });

  // Group events by month
  const grouped = useMemo(() => {
    if (!calEvents) return [];
    const map = new Map<string, typeof calEvents>();
    for (const evt of calEvents) {
      const d = new Date(evt.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(evt);
    }
    return Array.from(map.entries()).map(([key, events]) => ({
      key,
      label: events[0]
        ? new Date(events[0].startDate).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })
        : key,
      events,
    }));
  }, [calEvents]);

  if (!activeGroup) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>Select a group to view calendar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Deadlines, milestones, and meetings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => calEvents && downloadICS(calEvents)}
            disabled={!calEvents || calEvents.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export ICS
          </Button>
          {isGroupAdmin && (
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Calendar Event</DialogTitle>
                </DialogHeader>
                <AddCalendarEventForm
                  groupId={gid}
                  onSuccess={() => {
                    setShowAdd(false);
                    utils.calendar.list.invalidate({ groupId: gid });
                    utils.calendar.upcoming.invalidate({ groupId: gid });
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : grouped.length > 0 ? (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.key}>
              <h2 className="font-serif font-bold text-lg mb-3">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.events.map((evt) => (
                  <Card key={evt.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="text-center shrink-0 w-14">
                        <p className="text-xs text-muted-foreground uppercase">
                          {new Date(evt.startDate).toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </p>
                        <p className="text-xl font-bold">
                          {new Date(evt.startDate).getDate()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(evt.startDate).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{evt.title}</p>
                        {evt.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {evt.description}
                          </p>
                        )}
                        <Badge
                          variant="secondary"
                          className={`mt-1 text-xs ${EVENT_TYPE_COLORS[evt.eventType] ?? ""}`}
                        >
                          {EVENT_TYPE_LABELS[evt.eventType] ?? evt.eventType}
                        </Badge>
                      </div>
                      {isGroupAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ groupId: gid, id: evt.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CalIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No calendar events yet</p>
          {isGroupAdmin && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowAdd(true)}
            >
              Add your first event
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function AddCalendarEventForm({ groupId, onSuccess }: { groupId: number; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<string>("meeting");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const createEvent = trpc.calendar.create.useMutation({
    onSuccess: () => {
      toast.success("Calendar event created");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) {
      toast.error("Title and start date are required");
      return;
    }
    createEvent.mutate({
      groupId,
      title: title.trim(),
      description: description.trim() || undefined,
      eventType: eventType as any,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="submission_deadline">
              Submission Deadline
            </SelectItem>
            <SelectItem value="voting_deadline">Voting Deadline</SelectItem>
            <SelectItem value="reading_milestone">
              Reading Milestone
            </SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={createEvent.isPending}>
        {createEvent.isPending && (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        )}
        Create Event
      </Button>
    </form>
  );
}
