import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Calendar, Plus, Trophy } from "lucide-react";
import { useLocation } from "wouter";

export default function EventsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: allEvents, isLoading } = trpc.events.list.useQuery();

  const active =
    allEvents?.filter(
      (e) => e.status === "submissions_open" || e.status === "voting"
    ) ?? [];
  const completed = allEvents?.filter((e) => e.status === "completed") ?? [];

  const schemeLabel = (s: string) => {
    if (s === "tournament") return "Tournament";
    if (s === "simple_majority") return "Majority";
    if (s === "ranked_choice") return "Ranked Choice";
    return s;
  };

  const statusBadge = (s: string) => {
    if (s === "submissions_open")
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          Submissions Open
        </Badge>
      );
    if (s === "voting")
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Voting
        </Badge>
      );
    if (s === "completed")
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Completed
        </Badge>
      );
    return <Badge variant="secondary">{s}</Badge>;
  };

  const EventCard = ({ event }: { event: NonNullable<typeof allEvents>[0] }) => (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setLocation(`/events/${event.id}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{event.title}</h3>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {event.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" />
                {schemeLabel(event.votingScheme)}
              </span>
              {event.submissionDeadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Due{" "}
                  {new Date(event.submissionDeadline).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">{statusBadge(event.status)}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Events</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Book selection events and voting rounds
          </p>
        </div>
        {user?.role === "admin" && (
          <Button onClick={() => setLocation("/events/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              Active ({active.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completed.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-3 mt-4">
            {active.length > 0 ? (
              active.map((e) => <EventCard key={e.id} event={e} />)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No active events</p>
                {user?.role === "admin" && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setLocation("/events/new")}
                  >
                    Create your first event
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-3 mt-4">
            {completed.length > 0 ? (
              completed.map((e) => <EventCard key={e.id} event={e} />)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No completed events yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
