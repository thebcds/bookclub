import BracketTree from "@/components/BracketTree";
import OpenLibrarySearch from "@/components/OpenLibrarySearch";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Check,
  Crown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Trophy,
  Vote,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = parseInt(id);
  const { user } = useAuth();
  const { activeGroup, isGroupAdmin } = useGroup();
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
      toast.success("Voting started! Notifications sent.");
      utils.events.getById.invalidate({ id: eventId });
      utils.brackets.getForEvent.invalidate({ eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveVoting = trpc.voting.resolve.useMutation({
    onSuccess: () => {
      toast.success("Voting resolved! Winner selected.");
      utils.events.getById.invalidate({ id: eventId });
      utils.voting.getResults.invalidate({ eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const gid = activeGroup?.id;
  const [showEditDialog, setShowEditDialog] = useState(false);

  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Event updated!");
      utils.events.getById.invalidate({ id: eventId });
      setShowEditDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const overrideWinner = trpc.events.overrideWinner.useMutation({
    onSuccess: () => {
      toast.success("Winner updated!");
      utils.events.getById.invalidate({ id: eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const reopenSubmissions = trpc.events.reopenSubmissions.useMutation({
    onSuccess: () => {
      toast.success("Submissions reopened!");
      utils.events.getById.invalidate({ id: eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.events.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated!");
      utils.events.getById.invalidate({ id: eventId });
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
        : event.votingScheme === "no_vote"
          ? "No Vote"
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
            {event.adminCurated && (
              <Badge variant="outline" className="border-amber-400 text-amber-700 gap-1">
                <Crown className="h-3 w-3" />
                Admin Curated
              </Badge>
            )}
          </div>
        </div>
        {isGroupAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Event
              </DropdownMenuItem>
              {event.status !== "submissions_open" && (
                <DropdownMenuItem onClick={() => reopenSubmissions.mutate({ groupId: gid!, eventId })}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reopen Submissions
                </DropdownMenuItem>
              )}
              {event.status !== "cancelled" && (
                <DropdownMenuItem onClick={() => updateStatus.mutate({ groupId: gid!, eventId, status: "cancelled" })}>
                  Cancel Event
                </DropdownMenuItem>
              )}
              {event.status === "cancelled" && (
                <DropdownMenuItem onClick={() => updateStatus.mutate({ groupId: gid!, eventId, status: "submissions_open" })}>
                  Reactivate Event
                </DropdownMenuItem>
              )}
              {event.status === "completed" && subs && subs.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {subs.map((sub) => (
                    <DropdownMenuItem
                      key={sub.bookId}
                      onClick={() => overrideWinner.mutate({ groupId: gid!, eventId, bookId: sub.bookId })}
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Set Winner: {sub.bookTitle}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => overrideWinner.mutate({ groupId: gid!, eventId, bookId: null })}>
                    Clear Winner
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isGroupAdmin && event.status === "submissions_open" && event.votingScheme !== "no_vote" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {(subs?.length ?? 0)} / {event.maxTotalSubmissions} submitted
            </span>
            <Button
              onClick={() => startVoting.mutate({ groupId: gid!, eventId })}
              disabled={startVoting.isPending || (subs?.length ?? 0) < 2}
              title={(subs?.length ?? 0) < 2 ? "Need at least 2 submissions to start voting" : "Start the voting round"}
            >
              {startVoting.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Vote className="h-4 w-4 mr-2" />
              )}
              Start Voting
            </Button>
          </div>
        )}
        {event.status === "submissions_open" && event.votingScheme === "no_vote" && (
          <span className="text-sm text-muted-foreground">
            {(subs?.length ?? 0)} / {event.maxTotalSubmissions} submitted
            {event.maxTotalSubmissions === 1 && " (auto-completes on submission)"}
          </span>
        )}
        {isGroupAdmin &&
          event.status === "voting" &&
          event.votingScheme !== "tournament" && (
            <Button
              onClick={() => resolveVoting.mutate({ groupId: gid!, eventId })}
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
              {subs?.length ?? 0} / {event.maxTotalSubmissions}
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

      {/* Edit Event Dialog */}
      {isGroupAdmin && (
        <EditEventDialog
          event={event}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={(data) => updateEvent.mutate({ groupId: gid!, eventId, ...data })}
          isPending={updateEvent.isPending}
        />
      )}

      <Tabs defaultValue={event.status === "voting" ? "voting" : "submissions"}>
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          {(event.status === "voting" || event.status === "completed") && (
            <TabsTrigger value="voting">
              {event.votingScheme === "tournament" ? "Bracket" : "Voting"}
            </TabsTrigger>
          )}
          {event.status === "completed" && event.winningBookId && (
            <TabsTrigger value="progress">
              <BookMarked className="h-3.5 w-3.5 mr-1.5" />
              Reading Progress
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="submissions" className="mt-4">
          <SubmissionsTab
            eventId={eventId}
            event={event}
            subs={subs ?? []}
            mySubmission={mySubmission}
            currentUserId={user?.id}
          />
        </TabsContent>

        <TabsContent value="voting" className="mt-4">
          {event.votingScheme === "tournament" ? (
            <BracketTree
              eventId={eventId}
              groupId={gid!}
              brackets={bracketData ?? []}
              eventStatus={event.status}
              isAdmin={isGroupAdmin}
            />
          ) : (
            <VotingView
              eventId={eventId}
              groupId={gid!}
              event={event}
              subs={subs ?? []}
              myVote={myVote}
              results={votingResults}
            />
          )}
        </TabsContent>

        {event.status === "completed" && event.winningBookId && (
          <TabsContent value="progress" className="mt-4">
            <ReadingProgressTab eventId={eventId} groupId={gid!} winningBookId={event.winningBookId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ReadingProgressTab({ eventId, groupId, winningBookId }: { eventId: number; groupId: number; winningBookId: number }) {
  const { data: book } = trpc.books.getById.useQuery({ id: winningBookId });
  const { data: allProgress } = trpc.readingProgress.getForEvent.useQuery({ eventId });
  const { data: myProgress } = trpc.readingProgress.mine.useQuery({ eventId });
  const utils = trpc.useUtils();
  const [currentPage, setCurrentPage] = useState("");

  const updateProgress = trpc.readingProgress.update.useMutation({
    onSuccess: () => {
      toast.success("Progress updated!");
      utils.readingProgress.getForEvent.invalidate({ eventId });
      utils.readingProgress.mine.invalidate({ eventId });
      setCurrentPage("");
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = book?.pageCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Update my progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Update Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label htmlFor="currentPage" className="text-sm">Current Page</Label>
              <Input
                id="currentPage"
                type="number"
                min={0}
                max={totalPages || undefined}
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                placeholder={myProgress ? `Currently on page ${myProgress.currentPage}` : "Enter page number"}
              />
            </div>
            {totalPages > 0 && (
              <div className="text-sm text-muted-foreground pt-5">/ {totalPages} pages</div>
            )}
            <Button
              className="mt-5"
              onClick={() => updateProgress.mutate({ groupId, eventId, currentPage: Number(currentPage), totalPages: totalPages || undefined })}
              disabled={!currentPage || updateProgress.isPending}
            >
              {updateProgress.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
            </Button>
          </div>
          {myProgress && totalPages > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Your progress</span>
                <span>{Math.round((myProgress.currentPage / totalPages) * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (myProgress.currentPage / totalPages) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group progress */}
      {allProgress && allProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Group Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allProgress.map((p) => {
                const pct = totalPages > 0 ? Math.round((p.currentPage / totalPages) * 100) : 0;
                return (
                  <div key={p.userId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{p.userName ?? "Member"}</span>
                      <span className="text-muted-foreground">
                        {p.currentPage}{totalPages > 0 ? ` / ${totalPages}` : ""} pages ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WinnerCard({ bookId }: { bookId: number }) {
  const { data: book } = trpc.books.getById.useQuery({ id: bookId });
  if (!book) return null;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 flex items-center gap-4">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-20 w-14 rounded-lg object-cover shadow-md"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="p-3 rounded-full bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
        )}
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
  currentUserId,
}: {
  eventId: number;
  event: any;
  subs: any[];
  mySubmission: any;
  currentUserId?: number;
}) {
  const [showAddBook, setShowAddBook] = useState(false);
  const utils = trpc.useUtils();

  return (
    <div className="space-y-4">
      {event.status === "submissions_open" && (
    (() => {
      const mySubCount = Array.isArray(mySubmission) ? mySubmission.length : (mySubmission ? 1 : 0);
      const perMemberLimit = event.adminCurated ? (event.maxTotalSubmissions ?? 8) : (event.maxSubmissionsPerMember ?? 1);
      const totalSubs = subs?.length ?? 0;
      const totalLimit = event.maxTotalSubmissions ?? 8;
      const isCreator = event.createdBy === currentUserId;

      // Admin-curated mode: only the event creator can submit
      if (event.adminCurated && !isCreator) {
        return (
          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-600" />
              This event has admin-curated submissions. The event creator is selecting all books for the group to vote on.
            </p>
            <p className="text-xs text-muted-foreground mt-1">{totalSubs}/{totalLimit} books submitted so far.</p>
          </div>
        );
      }

      const canSubmitMore = mySubCount < perMemberLimit && totalSubs < totalLimit;
      return canSubmitMore ? (
        <Dialog open={showAddBook} onOpenChange={setShowAddBook}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {event.adminCurated ? `Add a Book (${totalSubs}/${totalLimit})` : `Submit a Book ${perMemberLimit > 1 ? `(${mySubCount}/${perMemberLimit})` : ""}`}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{event.adminCurated ? "Add a Book to the Lineup" : "Submit a Book"}</DialogTitle>
            </DialogHeader>
            <SubmitBookForm
              eventId={eventId}
              groupId={event.groupId}
              onSuccess={() => {
                setShowAddBook(false);
                utils.submissions.listForEvent.invalidate({ eventId });
                utils.submissions.mySubmission.invalidate({ eventId });
                utils.submissions.mySubmissions.invalidate({ eventId });
              }}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          {event.adminCurated
            ? `All ${totalLimit} books have been added to the lineup.`
            : perMemberLimit > 1
              ? `You've submitted ${mySubCount}/${perMemberLimit} books for this event.`
              : "You've submitted your book for this event."
          }
        </p>
      );
    })()
      )}
      {subs.length > 0 ? (
        <div className="grid gap-3">
          {subs.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {sub.bookCoverUrl ? (
                  <img
                    src={sub.bookCoverUrl}
                    alt={sub.bookTitle}
                    className="h-16 w-12 rounded object-cover shadow-sm shrink-0"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = "none";
                      el.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div className={`h-16 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 ${sub.bookCoverUrl ? "hidden" : ""}`}>
                  <BookOpen className="h-6 w-6 text-primary" />
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
  groupId,
  onSuccess,
}: {
  eventId: number;
  groupId: number;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [rating, setRating] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [isbn, setIsbn] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const createBook = trpc.books.create.useMutation();
  const submitBook = trpc.submissions.create.useMutation({
    onSuccess: () => {
      toast.success("Book submitted!");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleOpenLibrarySelect = (book: {
    title: string;
    author: string;
    coverUrl?: string;
    pageCount?: number;
    isbn?: string;
    genre?: string;
  }) => {
    setTitle(book.title);
    setAuthor(book.author);
    if (book.coverUrl) setCoverUrl(book.coverUrl);
    if (book.pageCount) setPageCount(String(book.pageCount));
    if (book.isbn) setIsbn(book.isbn);
    if (book.genre) setGenre(book.genre);
    setShowManual(true);
    toast.success(`Selected "${book.title}" — review details below`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      toast.error("Title and author are required");
      return;
    }
    try {
      const book = await createBook.mutateAsync({
        groupId,
        title: title.trim(),
        author: author.trim(),
        genre: genre || undefined,
        pageCount: pageCount ? parseInt(pageCount) : undefined,
        rating: rating ? parseInt(rating) : undefined,
        description: description || undefined,
        coverUrl: coverUrl || undefined,
        isbn: isbn || undefined,
      });
      await submitBook.mutateAsync({
        groupId,
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
    <div className="space-y-4">
      {/* Open Library Search */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Search Open Library</Label>
        <OpenLibrarySearch onSelect={handleOpenLibrarySelect} />
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or enter manually</span>
        <Separator className="flex-1" />
      </div>

      {!showManual && !title && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowManual(true)}
        >
          Enter book details manually
        </Button>
      )}

      {(showManual || title) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover preview */}
          {coverUrl && (
            <div className="flex justify-center">
              <img
                src={coverUrl}
                alt="Book cover"
                className="h-32 rounded-lg shadow-md object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Rating (0-100)</Label>
              <Input type="number" min="0" max="100" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="Critical rating" />
            </div>
            <div className="space-y-2">
              <Label>ISBN</Label>
              <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="ISBN" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cover URL</Label>
            <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
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
      )}
    </div>
  );
}

function EditEventDialog({
  event,
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [votingScheme, setVotingScheme] = useState(event.votingScheme);
  const [maxPageCount, setMaxPageCount] = useState(event.maxPageCount?.toString() ?? "");
  const [minRating, setMinRating] = useState(event.minRating?.toString() ?? "");
  const [maxTotalSubmissions, setMaxTotalSubmissions] = useState(event.maxTotalSubmissions?.toString() ?? "8");
  const [maxSubmissionsPerMember, setMaxSubmissionsPerMember] = useState(event.maxSubmissionsPerMember?.toString() ?? "1");
  const [allowPreviouslyRead, setAllowPreviouslyRead] = useState(event.allowPreviouslyRead ?? false);
  const [adminCurated, setAdminCurated] = useState(event.adminCurated ?? false);
  const [anonymousSubmissions, setAnonymousSubmissions] = useState(event.anonymousSubmissions ?? false);
  const [submissionDeadline, setSubmissionDeadline] = useState(
    event.submissionDeadline ? new Date(event.submissionDeadline).toISOString().slice(0, 16) : ""
  );
  const [votingDeadline, setVotingDeadline] = useState(
    event.votingDeadline ? new Date(event.votingDeadline).toISOString().slice(0, 16) : ""
  );
  const [readingDeadline, setReadingDeadline] = useState(
    event.readingDeadline ? new Date(event.readingDeadline).toISOString().slice(0, 16) : ""
  );

  const handleSave = () => {
    const data: any = {};
    if (title !== event.title) data.title = title;
    if (description !== (event.description ?? "")) data.description = description;
    if (votingScheme !== event.votingScheme) data.votingScheme = votingScheme;
    if (maxPageCount !== (event.maxPageCount?.toString() ?? "")) {
      data.maxPageCount = maxPageCount ? parseInt(maxPageCount) : null;
    }
    if (minRating !== (event.minRating?.toString() ?? "")) {
      data.minRating = minRating ? parseInt(minRating) : null;
    }
    if (parseInt(maxTotalSubmissions) !== event.maxTotalSubmissions) {
      data.maxTotalSubmissions = parseInt(maxTotalSubmissions);
    }
    if (parseInt(maxSubmissionsPerMember) !== event.maxSubmissionsPerMember) {
      data.maxSubmissionsPerMember = parseInt(maxSubmissionsPerMember);
    }
    if (allowPreviouslyRead !== event.allowPreviouslyRead) data.allowPreviouslyRead = allowPreviouslyRead;
    if (anonymousSubmissions !== event.anonymousSubmissions) data.anonymousSubmissions = anonymousSubmissions;
    if (adminCurated !== (event.adminCurated ?? false)) data.adminCurated = adminCurated;
    const newSubDeadline = submissionDeadline ? new Date(submissionDeadline) : null;
    const oldSubDeadline = event.submissionDeadline ? new Date(event.submissionDeadline).toISOString().slice(0, 16) : "";
    if (submissionDeadline !== oldSubDeadline) data.submissionDeadline = newSubDeadline;
    const newVoteDeadline = votingDeadline ? new Date(votingDeadline) : null;
    const oldVoteDeadline = event.votingDeadline ? new Date(event.votingDeadline).toISOString().slice(0, 16) : "";
    if (votingDeadline !== oldVoteDeadline) data.votingDeadline = newVoteDeadline;
    const newReadDeadline = readingDeadline ? new Date(readingDeadline) : null;
    const oldReadDeadline = event.readingDeadline ? new Date(event.readingDeadline).toISOString().slice(0, 16) : "";
    if (readingDeadline !== oldReadDeadline) data.readingDeadline = newReadDeadline;
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Voting Scheme</Label>
            <Select value={votingScheme} onValueChange={setVotingScheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tournament">Tournament Bracket</SelectItem>
                <SelectItem value="simple_majority">Simple Majority</SelectItem>
                <SelectItem value="ranked_choice">Ranked Choice</SelectItem>
                <SelectItem value="no_vote">No Vote</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Max Total Submissions</Label>
              <Input type="number" min="1" max="64" value={maxTotalSubmissions} onChange={(e) => setMaxTotalSubmissions(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Per Member Limit</Label>
              <Input type="number" min="1" max="64" value={maxSubmissionsPerMember} onChange={(e) => setMaxSubmissionsPerMember(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Max Pages</Label>
              <Input type="number" value={maxPageCount} onChange={(e) => setMaxPageCount(e.target.value)} placeholder="No limit" />
            </div>
            <div className="space-y-2">
              <Label>Min Rating (0-100)</Label>
              <Input type="number" min="0" max="100" value={minRating} onChange={(e) => setMinRating(e.target.value)} placeholder="No minimum" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Allow Previously Read</Label>
            <Switch checked={allowPreviouslyRead} onCheckedChange={setAllowPreviouslyRead} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Anonymous Submissions</Label>
            <Switch checked={anonymousSubmissions} onCheckedChange={setAnonymousSubmissions} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Admin Curated</Label>
              <p className="text-xs text-muted-foreground">Only the event creator can submit books</p>
            </div>
            <Switch checked={adminCurated} onCheckedChange={setAdminCurated} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Submission Deadline</Label>
            <Input type="datetime-local" value={submissionDeadline} onChange={(e) => setSubmissionDeadline(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Voting Deadline</Label>
            <Input type="datetime-local" value={votingDeadline} onChange={(e) => setVotingDeadline(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Reading Deadline</Label>
            <Input type="datetime-local" value={readingDeadline} onChange={(e) => setReadingDeadline(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VotingView({
  eventId,
  groupId,
  event,
  subs,
  myVote,
  results,
}: {
  eventId: number;
  groupId: number;
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
                {sub.bookCoverUrl ? (
                  <img
                    src={sub.bookCoverUrl}
                    alt={sub.bookTitle}
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
                    {sub.bookCoverUrl ? (
                      <img
                        src={sub.bookCoverUrl}
                        alt={sub.bookTitle}
                        className="h-10 w-7 rounded object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    )}
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
