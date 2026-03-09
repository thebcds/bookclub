import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Crown,
  Loader2,
  Plus,
  Trophy,
  Vote,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = parseInt(id);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: event, isLoading } = trpc.events.getById.useQuery({ id: eventId });
  const { data: subs } = trpc.submissions.listForEvent.useQuery({ eventId });
  const { data: mySubmission } = trpc.submissions.mySubmission.useQuery({ eventId });
  const { data: bracketData } = trpc.brackets.getForEvent.useQuery(
    { eventId },
    { enabled: event?.votingScheme === "tournament" }
  );
  const { data: votingResults } = trpc.voting.getResults.useQuery(
    { eventId },
    { enabled: event?.votingScheme !== "tournament" && event?.status === "voting" }
  );
  const { data: myVote } = trpc.voting.myVote.useQuery(
    { eventId },
    { enabled: event?.votingScheme !== "tournament" }
  );

  const startVoting = trpc.events.startVoting.useMutation({
    onSuccess: () => {
      toast.success("Voting started!");
      utils.events.getById.invalidate({ id: eventId });
      utils.brackets.getForEvent.invalidate({ eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveVoting = trpc.voting.resolve.useMutation({
    onSuccess: (data) => {
      toast.success("Voting resolved! Winner selected.");
      utils.events.getById.invalidate({ id: eventId });
      utils.voting.getResults.invalidate({ eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p>Event not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/events")}>
          Back to events
        </Button>
      </div>
    );
  }

  const schemeLabel =
    event.votingScheme === "tournament"
      ? "Tournament Bracket"
      : event.votingScheme === "simple_majority"
        ? "Simple Majority"
        : "Ranked Choice";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/events")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-serif font-bold truncate">{event.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{schemeLabel}</Badge>
            <Badge
              className={
                event.status === "submissions_open"
                  ? "bg-emerald-100 text-emerald-800"
                  : event.status === "voting"
                    ? "bg-amber-100 text-amber-800"
                    : event.status === "completed"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
              }
            >
              {event.status === "submissions_open" ? "Submissions Open" : event.status}
            </Badge>
          </div>
        </div>
        {user?.role === "admin" && event.status === "submissions_open" && (
          <Button
            onClick={() => startVoting.mutate({ eventId })}
            disabled={startVoting.isPending}
          >
            {startVoting.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Vote className="h-4 w-4 mr-2" />
            )}
            Start Voting
          </Button>
        )}
        {user?.role === "admin" &&
          event.status === "voting" &&
          event.votingScheme !== "tournament" && (
            <Button
              onClick={() => resolveVoting.mutate({ eventId })}
              disabled={resolveVoting.isPending}
            >
              {resolveVoting.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              Resolve Winner
            </Button>
          )}
      </div>

      {event.description && (
        <p className="text-muted-foreground">{event.description}</p>
      )}

      {/* Event info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {event.maxPageCount && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Max Pages</p>
              <p className="font-semibold">{event.maxPageCount}</p>
            </CardContent>
          </Card>
        )}
        {event.minRating && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Min Rating</p>
              <p className="font-semibold">{event.minRating}/100</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Submissions</p>
            <p className="font-semibold">
              {subs?.length ?? 0} / {event.maxSubmissions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Anonymous</p>
            <p className="font-semibold">
              {event.anonymousSubmissions ? "Yes" : "No"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deadlines */}
      {(event.submissionDeadline || event.votingDeadline || event.readingDeadline) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {event.submissionDeadline && (
                <div>
                  <p className="text-xs text-muted-foreground">Submissions</p>
                  <p className="font-medium">
                    {new Date(event.submissionDeadline).toLocaleString()}
                  </p>
                </div>
              )}
              {event.votingDeadline && (
                <div>
                  <p className="text-xs text-muted-foreground">Voting</p>
                  <p className="font-medium">
                    {new Date(event.votingDeadline).toLocaleString()}
                  </p>
                </div>
              )}
              {event.readingDeadline && (
                <div>
                  <p className="text-xs text-muted-foreground">Reading</p>
                  <p className="font-medium">
                    {new Date(event.readingDeadline).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Winner display */}
      {event.status === "completed" && event.winningBookId && (
        <WinnerCard bookId={event.winningBookId} />
      )}

      <Tabs defaultValue={event.status === "voting" ? "voting" : "submissions"}>
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          {(event.status === "voting" || event.status === "completed") && (
            <TabsTrigger value="voting">
              {event.votingScheme === "tournament" ? "Bracket" : "Voting"}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="submissions" className="mt-4">
          <SubmissionsTab
            eventId={eventId}
            event={event}
            subs={subs ?? []}
            mySubmission={mySubmission}
          />
        </TabsContent>

        <TabsContent value="voting" className="mt-4">
          {event.votingScheme === "tournament" ? (
            <TournamentBracketView
              eventId={eventId}
              brackets={bracketData ?? []}
              eventStatus={event.status}
            />
          ) : (
            <VotingView
              eventId={eventId}
              event={event}
              subs={subs ?? []}
              myVote={myVote}
              results={votingResults}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WinnerCard({ bookId }: { bookId: number }) {
  const { data: book } = trpc.books.getById.useQuery({ id: bookId });
  if (!book) return null;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Winner
          </p>
          <p className="font-serif font-bold text-lg">{book.title}</p>
          <p className="text-sm text-muted-foreground">by {book.author}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SubmissionsTab({
  eventId,
  event,
  subs,
  mySubmission,
}: {
  eventId: number;
  event: any;
  subs: any[];
  mySubmission: any;
}) {
  const [showAddBook, setShowAddBook] = useState(false);
  const utils = trpc.useUtils();

  return (
    <div className="space-y-4">
      {event.status === "submissions_open" && !mySubmission && (
        <Dialog open={showAddBook} onOpenChange={setShowAddBook}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Submit a Book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit a Book</DialogTitle>
            </DialogHeader>
            <SubmitBookForm
              eventId={eventId}
              onSuccess={() => {
                setShowAddBook(false);
                utils.submissions.listForEvent.invalidate({ eventId });
                utils.submissions.mySubmission.invalidate({ eventId });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      {mySubmission && event.status === "submissions_open" && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          You&apos;ve submitted your book for this event.
        </p>
      )}
      {subs.length > 0 ? (
        <div className="grid gap-3">
          {subs.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-14 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{sub.bookTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {sub.bookAuthor}
                    {sub.bookGenre && ` · ${sub.bookGenre}`}
                    {sub.bookPageCount && ` · ${sub.bookPageCount} pages`}
                  </p>
                </div>
                {!event.anonymousSubmissions && sub.submitterName && (
                  <p className="text-xs text-muted-foreground shrink-0">
                    by {sub.submitterName}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No submissions yet</p>
        </div>
      )}
    </div>
  );
}

function SubmitBookForm({
  eventId,
  onSuccess,
}: {
  eventId: number;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [rating, setRating] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const createBook = trpc.books.create.useMutation();
  const submitBook = trpc.submissions.create.useMutation({
    onSuccess: () => {
      toast.success("Book submitted!");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      toast.error("Title and author are required");
      return;
    }
    try {
      const book = await createBook.mutateAsync({
        title: title.trim(),
        author: author.trim(),
        genre: genre || undefined,
        pageCount: pageCount ? parseInt(pageCount) : undefined,
        rating: rating ? parseInt(rating) : undefined,
        description: description || undefined,
      });
      await submitBook.mutateAsync({
        eventId,
        bookId: book.id,
        isAnonymous,
      });
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createBook.isPending || submitBook.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" />
      </div>
      <div className="space-y-2">
        <Label>Author *</Label>
        <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Genre</Label>
          <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Fiction" />
        </div>
        <div className="space-y-2">
          <Label>Pages</Label>
          <Input type="number" value={pageCount} onChange={(e) => setPageCount(e.target.value)} placeholder="Page count" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Rating (0-100)</Label>
        <Input type="number" min="0" max="100" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="Critical rating" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
      </div>
      <div className="flex items-center justify-between">
        <Label>Anonymous submission</Label>
        <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Book
      </Button>
    </form>
  );
}

function TournamentBracketView({
  eventId,
  brackets,
  eventStatus,
}: {
  eventId: number;
  brackets: any[];
  eventStatus: string;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const voteMutation = trpc.brackets.vote.useMutation({
    onSuccess: () => {
      toast.success("Vote cast!");
      utils.brackets.getForEvent.invalidate({ eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveMutation = trpc.brackets.resolveMatch.useMutation({
    onSuccess: () => {
      toast.success("Match resolved!");
      utils.brackets.getForEvent.invalidate({ eventId });
      utils.events.getById.invalidate({ id: eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (brackets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>Bracket not generated yet</p>
      </div>
    );
  }

  const maxRound = Math.max(...brackets.map((b) => b.round));
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

  const getRoundLabel = (round: number) => {
    if (round === maxRound) return "Finals";
    if (round === maxRound - 1) return "Conference Finals";
    if (round === 1) return "Round 1";
    return `Round ${round}`;
  };

  return (
    <div className="space-y-6">
      {rounds.map((round) => {
        const roundBrackets = brackets.filter((b) => b.round === round);
        return (
          <div key={round}>
            <h3 className="font-serif font-bold text-lg mb-3">
              {getRoundLabel(round)}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {roundBrackets.map((bracket) => (
                <BracketMatchCard
                  key={bracket.id}
                  bracket={bracket}
                  eventId={eventId}
                  isAdmin={user?.role === "admin"}
                  eventStatus={eventStatus}
                  onVote={(bookId) =>
                    voteMutation.mutate({
                      bracketId: bracket.id,
                      bookId,
                      eventId,
                    })
                  }
                  onResolve={() =>
                    resolveMutation.mutate({
                      bracketId: bracket.id,
                      eventId,
                    })
                  }
                  isVoting={voteMutation.isPending}
                  isResolving={resolveMutation.isPending}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BracketMatchCard({
  bracket,
  eventId,
  isAdmin,
  eventStatus,
  onVote,
  onResolve,
  isVoting,
  isResolving,
}: {
  bracket: any;
  eventId: number;
  isAdmin: boolean;
  eventStatus: string;
  onVote: (bookId: number) => void;
  onResolve: () => void;
  isVoting: boolean;
  isResolving: boolean;
}) {
  const { data: myVote } = trpc.brackets.myVote.useQuery(
    { bracketId: bracket.id },
    { enabled: bracket.status === "voting" }
  );
  const { data: votes } = trpc.brackets.getVotes.useQuery(
    { bracketId: bracket.id },
    { enabled: bracket.status !== "pending" }
  );

  const book1Votes = votes?.filter((v) => v.bookId === bracket.book1Id).length ?? 0;
  const book2Votes = votes?.filter((v) => v.bookId === bracket.book2Id).length ?? 0;

  const canVote = bracket.status === "voting" && !myVote && eventStatus === "voting";

  return (
    <Card
      className={
        bracket.status === "completed"
          ? "opacity-80"
          : bracket.status === "voting"
            ? "border-primary/30"
            : ""
      }
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {bracket.conference === "A" && bracket.round < Math.max(bracket.round)
              ? `Conf A`
              : bracket.conference === "B"
                ? `Conf B`
                : ""}
            {bracket.status === "voting" && " · Voting"}
            {bracket.status === "completed" && " · Done"}
            {bracket.status === "pending" && " · Pending"}
          </Badge>
          {bracket.status !== "pending" && (
            <span className="text-xs text-muted-foreground">
              {(votes?.length ?? 0)} votes
            </span>
          )}
        </div>

        {/* Book 1 */}
        <div
          className={`p-3 rounded-lg border transition-colors ${
            canVote ? "cursor-pointer hover:bg-accent" : ""
          } ${bracket.winnerId === bracket.book1Id ? "border-primary bg-primary/5" : ""} ${
            myVote?.bookId === bracket.book1Id ? "ring-2 ring-primary/50" : ""
          }`}
          onClick={() => canVote && bracket.book1Id && onVote(bracket.book1Id)}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              {bracket.book1 ? (
                <>
                  <p className="font-medium truncate">
                    {bracket.book1Seed && (
                      <span className="text-xs text-muted-foreground mr-1">
                        #{bracket.book1Seed}
                      </span>
                    )}
                    {bracket.book1.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bracket.book1.author}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground italic">TBD</p>
              )}
            </div>
            {bracket.status !== "pending" && (
              <span className="text-sm font-bold ml-2">{book1Votes}</span>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground font-medium">
          VS
        </div>

        {/* Book 2 */}
        <div
          className={`p-3 rounded-lg border transition-colors ${
            canVote ? "cursor-pointer hover:bg-accent" : ""
          } ${bracket.winnerId === bracket.book2Id ? "border-primary bg-primary/5" : ""} ${
            myVote?.bookId === bracket.book2Id ? "ring-2 ring-primary/50" : ""
          }`}
          onClick={() => canVote && bracket.book2Id && onVote(bracket.book2Id)}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              {bracket.book2 ? (
                <>
                  <p className="font-medium truncate">
                    {bracket.book2Seed && (
                      <span className="text-xs text-muted-foreground mr-1">
                        #{bracket.book2Seed}
                      </span>
                    )}
                    {bracket.book2.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bracket.book2.author}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground italic">TBD</p>
              )}
            </div>
            {bracket.status !== "pending" && (
              <span className="text-sm font-bold ml-2">{book2Votes}</span>
            )}
          </div>
        </div>

        {isAdmin && bracket.status === "voting" && eventStatus === "voting" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onResolve}
            disabled={isResolving}
          >
            {isResolving ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Trophy className="h-3 w-3 mr-1" />
            )}
            Resolve Match
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function VotingView({
  eventId,
  event,
  subs,
  myVote,
  results,
}: {
  eventId: number;
  event: any;
  subs: any[];
  myVote: any;
  results: any;
}) {
  const utils = trpc.useUtils();
  const [rankedOrder, setRankedOrder] = useState<number[]>([]);

  const castSimple = trpc.voting.castSimple.useMutation({
    onSuccess: () => {
      toast.success("Vote cast!");
      utils.voting.myVote.invalidate({ eventId });
      utils.voting.getResults.invalidate({ eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const castRanked = trpc.voting.castRanked.useMutation({
    onSuccess: () => {
      toast.success("Rankings submitted!");
      utils.voting.myVote.invalidate({ eventId });
      utils.voting.getResults.invalidate({ eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const canVote = event.status === "voting" && !myVote;

  if (event.votingScheme === "simple_majority") {
    return (
      <div className="space-y-4">
        {myVote && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            You&apos;ve cast your vote.
          </p>
        )}
        <div className="grid gap-3">
          {subs.map((sub) => (
            <Card
              key={sub.id}
              className={`${canVote ? "cursor-pointer hover:shadow-md" : ""} ${
                myVote?.bookId === sub.bookId ? "border-primary" : ""
              }`}
              onClick={() =>
                canVote && castSimple.mutate({ eventId, bookId: sub.bookId })
              }
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{sub.bookTitle}</p>
                  <p className="text-sm text-muted-foreground">{sub.bookAuthor}</p>
                </div>
                {results?.results && (
                  <div className="text-right shrink-0">
                    <p className="font-bold">
                      {results.results.find((r: any) => r.bookId === sub.bookId)?.votes ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">votes</p>
                  </div>
                )}
                {canVote && (
                  <Button variant="outline" size="sm" disabled={castSimple.isPending}>
                    Vote
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Ranked choice
  return (
    <div className="space-y-4">
      {myVote && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          You&apos;ve submitted your rankings.
        </p>
      )}
      {canVote && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Click books in order of preference (1st choice first):
          </p>
          <div className="grid gap-2">
            {subs
              .filter((s) => !rankedOrder.includes(s.bookId))
              .map((sub) => (
                <Card
                  key={sub.id}
                  className="cursor-pointer hover:shadow-md"
                  onClick={() =>
                    setRankedOrder((prev) => [...prev, sub.bookId])
                  }
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{sub.bookTitle}</span>
                    <span className="text-sm text-muted-foreground">
                      {sub.bookAuthor}
                    </span>
                  </CardContent>
                </Card>
              ))}
          </div>
          {rankedOrder.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Your rankings:</p>
              {rankedOrder.map((bookId, idx) => {
                const sub = subs.find((s) => s.bookId === bookId);
                return (
                  <div
                    key={bookId}
                    className="flex items-center gap-3 p-2 rounded border bg-accent/30"
                  >
                    <span className="font-bold text-primary w-6 text-center">
                      {idx + 1}
                    </span>
                    <span className="truncate">{sub?.bookTitle}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-xs"
                      onClick={() =>
                        setRankedOrder((prev) =>
                          prev.filter((id) => id !== bookId)
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
              <Button
                className="w-full"
                disabled={rankedOrder.length === 0 || castRanked.isPending}
                onClick={() =>
                  castRanked.mutate({ eventId, rankings: rankedOrder })
                }
              >
                {castRanked.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Submit Rankings
              </Button>
            </div>
          )}
        </div>
      )}
      {results?.results && results.results.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Current Results</h4>
          {results.results.map((r: any, idx: number) => (
            <div
              key={r.bookId}
              className="flex items-center gap-3 p-3 rounded border"
            >
              <span className="font-bold text-primary w-6 text-center">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{r.bookTitle}</p>
                <p className="text-xs text-muted-foreground">{r.bookAuthor}</p>
              </div>
              <span className="font-bold">{r.votes} votes</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
