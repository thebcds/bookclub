import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Trophy,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: activeEvents, isLoading: eventsLoading } =
    trpc.events.active.useQuery();
  const { data: completedEvents, isLoading: completedLoading } =
    trpc.events.completed.useQuery();
  const { data: members, isLoading: membersLoading } =
    trpc.members.list.useQuery();
  const { data: upcomingCal, isLoading: calLoading } =
    trpc.calendar.upcoming.useQuery();

  const schemeLabel = (s: string) => {
    if (s === "tournament") return "Tournament Bracket";
    if (s === "simple_majority") return "Simple Majority";
    if (s === "ranked_choice") return "Ranked Choice";
    return s;
  };

  const statusColor = (s: string) => {
    if (s === "submissions_open") return "bg-emerald-100 text-emerald-800";
    if (s === "voting") return "bg-amber-100 text-amber-800";
    if (s === "completed") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening in your book club.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {eventsLoading ? (
                    <Skeleton className="h-7 w-8" />
                  ) : (
                    activeEvents?.length ?? 0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Active Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {completedLoading ? (
                    <Skeleton className="h-7 w-8" />
                  ) : (
                    completedEvents?.length ?? 0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Books Read</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {membersLoading ? (
                    <Skeleton className="h-7 w-8" />
                  ) : (
                    members?.length ?? 0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {calLoading ? (
                    <Skeleton className="h-7 w-8" />
                  ) : (
                    upcomingCal?.length ?? 0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Upcoming Events
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-serif">Active Events</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/events")}
            >
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activeEvents && activeEvents.length > 0 ? (
              <div className="space-y-3">
                {activeEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/events/${event.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {schemeLabel(event.votingScheme)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={statusColor(event.status)}
                    >
                      {event.status === "submissions_open"
                        ? "Submissions"
                        : event.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No active events</p>
                {user?.role === "admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setLocation("/events/new")}
                  >
                    Create Event
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Read */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-serif">Recently Read</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/books")}
            >
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {completedLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : completedEvents && completedEvents.length > 0 ? (
              <div className="space-y-3">
                {completedEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    {event.bookCoverUrl ? (
                      <img
                        src={event.bookCoverUrl}
                        alt={event.bookTitle ?? ""}
                        className="h-14 w-10 rounded object-cover shadow-sm shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-14 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {event.bookTitle ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {event.bookAuthor ?? "Unknown Author"} &middot;{" "}
                        {schemeLabel(event.votingScheme)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No books read yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Calendar */}
      {upcomingCal && upcomingCal.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-serif">Coming Up</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/calendar")}
            >
              View calendar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingCal.slice(0, 4).map((cal) => (
                <div
                  key={cal.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="text-center shrink-0 w-12">
                    <p className="text-xs text-muted-foreground uppercase">
                      {new Date(cal.startDate).toLocaleDateString("en-US", {
                        month: "short",
                      })}
                    </p>
                    <p className="text-lg font-bold">
                      {new Date(cal.startDate).getDate()}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{cal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cal.eventType.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
