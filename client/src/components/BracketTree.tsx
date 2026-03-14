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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Crown, Loader2, Trophy, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type BracketMatch = {
  id: number;
  conference: string;
  round: number;
  matchOrder: number;
  book1Id: number | null;
  book2Id: number | null;
  book1Seed: number | null;
  book2Seed: number | null;
  winnerId: number | null;
  status: string;
  book1: any;
  book2: any;
  winner: any;
};

type Props = {
  eventId: number;
  groupId: number;
  brackets: BracketMatch[];
  eventStatus: string;
  isAdmin: boolean;
  anonymousVoting?: boolean;
  hideTalliesUntilComplete?: boolean;
  totalMembers?: number;
};

export default function BracketTree({ eventId, groupId, brackets, eventStatus, isAdmin, anonymousVoting, hideTalliesUntilComplete, totalMembers = 0 }: Props) {
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

  const maxRound = useMemo(() => Math.max(...brackets.map((b) => b.round)), [brackets]);

  // Separate conferences
  const confA = useMemo(
    () => brackets.filter((b) => b.conference === "A" && b.round < maxRound),
    [brackets, maxRound]
  );
  const confB = useMemo(
    () => brackets.filter((b) => b.conference === "B" && b.round < maxRound),
    [brackets, maxRound]
  );
  const finalMatch = useMemo(
    () => brackets.find((b) => b.round === maxRound),
    [brackets, maxRound]
  );

  const confARounds = useMemo(() => {
    const rounds = new Set(confA.map((b) => b.round));
    return Array.from(rounds).sort((a, b) => a - b);
  }, [confA]);

  const confBRounds = useMemo(() => {
    const rounds = new Set(confB.map((b) => b.round));
    return Array.from(rounds).sort((a, b) => a - b);
  }, [confB]);

  if (brackets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>Bracket not generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Conference A */}
      <div>
        <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">Conference A</Badge>
        </h3>
        <ScrollArea className="w-full">
          <div className="flex gap-6 pb-4" style={{ minWidth: confARounds.length * 240 }}>
            {confARounds.map((round) => {
              const roundMatches = confA
                .filter((b) => b.round === round)
                .sort((a, b) => a.matchOrder - b.matchOrder);
              return (
                <RoundColumn
                  key={`A-${round}`}
                  round={round}
                  maxRound={maxRound}
                  matches={roundMatches}
                  eventId={eventId}
                  groupId={groupId}
                  eventStatus={eventStatus}
                  isAdmin={isAdmin}
                  anonymousVoting={anonymousVoting}
                  hideTalliesUntilComplete={hideTalliesUntilComplete}
                  totalMembers={totalMembers}
                  onVote={(bracketId, bookId) =>
                    voteMutation.mutate({ bracketId, bookId, eventId })
                  }
                  onResolve={(bracketId) =>
                    resolveMutation.mutate({ groupId, bracketId, eventId })
                  }
                  isVoting={voteMutation.isPending}
                  isResolving={resolveMutation.isPending}
                />
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Finals */}
      {finalMatch && (
        <div>
          <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Championship Final
          </h3>
          <div className="max-w-md mx-auto">
            <MatchNode
              match={finalMatch}
              eventId={eventId}
              groupId={groupId}
              eventStatus={eventStatus}
              isAdmin={isAdmin}
              anonymousVoting={anonymousVoting}
              hideTalliesUntilComplete={hideTalliesUntilComplete}
              totalMembers={totalMembers}
              isFinal
              onVote={(bookId) =>
                voteMutation.mutate({ bracketId: finalMatch.id, bookId, eventId })
              }
              onResolve={() =>
                resolveMutation.mutate({ groupId, bracketId: finalMatch.id, eventId })
              }
              isVoting={voteMutation.isPending}
              isResolving={resolveMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Conference B */}
      <div>
        <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">Conference B</Badge>
        </h3>
        <ScrollArea className="w-full">
          <div className="flex gap-6 pb-4" style={{ minWidth: confBRounds.length * 240 }}>
            {confBRounds.map((round) => {
              const roundMatches = confB
                .filter((b) => b.round === round)
                .sort((a, b) => a.matchOrder - b.matchOrder);
              return (
                <RoundColumn
                  key={`B-${round}`}
                  round={round}
                  maxRound={maxRound}
                  matches={roundMatches}
                  eventId={eventId}
                  groupId={groupId}
                  eventStatus={eventStatus}
                  isAdmin={isAdmin}
                  anonymousVoting={anonymousVoting}
                  hideTalliesUntilComplete={hideTalliesUntilComplete}
                  totalMembers={totalMembers}
                  onVote={(bracketId, bookId) =>
                    voteMutation.mutate({ bracketId, bookId, eventId })
                  }
                  onResolve={(bracketId) =>
                    resolveMutation.mutate({ groupId, bracketId, eventId })
                  }
                  isVoting={voteMutation.isPending}
                  isResolving={resolveMutation.isPending}
                />
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}

function RoundColumn({
  round,
  maxRound,
  matches,
  eventId,
  groupId,
  eventStatus,
  isAdmin,
  anonymousVoting,
  hideTalliesUntilComplete,
  totalMembers,
  onVote,
  onResolve,
  isVoting,
  isResolving,
}: {
  round: number;
  maxRound: number;
  matches: BracketMatch[];
  eventId: number;
  groupId: number;
  eventStatus: string;
  isAdmin: boolean;
  anonymousVoting?: boolean;
  hideTalliesUntilComplete?: boolean;
  totalMembers?: number;
  onVote: (bracketId: number, bookId: number) => void;
  onResolve: (bracketId: number) => void;
  isVoting: boolean;
  isResolving: boolean;
}) {
  const getRoundLabel = (r: number) => {
    if (r === maxRound) return "Finals";
    if (r === maxRound - 1) return "Conf. Finals";
    if (r === 1) return "Round 1";
    return `Round ${r}`;
  };

  return (
    <div className="flex flex-col min-w-[220px]">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
        {getRoundLabel(round)}
      </h4>
      <div className="flex flex-col justify-around flex-1 gap-4">
        {matches.map((match) => (
            <MatchNode
            key={match.id}
            match={match}
            eventId={eventId}
            groupId={groupId}
            eventStatus={eventStatus}
            isAdmin={isAdmin}
            anonymousVoting={anonymousVoting}
            hideTalliesUntilComplete={hideTalliesUntilComplete}
            totalMembers={totalMembers}
            onVote={(bookId) => onVote(match.id, bookId)}
            onResolve={() => onResolve(match.id)}
            isVoting={isVoting}
            isResolving={isResolving}
          />
        ))}
      </div>
    </div>
  );
}

function MatchNode({
  match,
  eventId,
  groupId,
  eventStatus,
  isAdmin,
  anonymousVoting,
  hideTalliesUntilComplete,
  totalMembers = 0,
  isFinal,
  onVote,
  onResolve,
  isVoting,
  isResolving,
}: {
  match: BracketMatch;
  eventId: number;
  groupId: number;
  eventStatus: string;
  isAdmin: boolean;
  anonymousVoting?: boolean;
  hideTalliesUntilComplete?: boolean;
  totalMembers?: number;
  isFinal?: boolean;
  onVote: (bookId: number) => void;
  onResolve: () => void;
  isVoting: boolean;
  isResolving: boolean;
}) {
  const utils = trpc.useUtils();
  const [confirmBookId, setConfirmBookId] = useState<number | null>(null);

  const { data: myVote } = trpc.brackets.myVote.useQuery(
    { bracketId: match.id },
    { enabled: match.status === "voting" }
  );
  const { data: votes } = trpc.brackets.getVotes.useQuery(
    { bracketId: match.id, eventId },
    { enabled: match.status !== "pending" }
  );

  const undoVote = trpc.brackets.undoVote.useMutation({
    onSuccess: () => {
      toast.success("Vote retracted");
      utils.brackets.myVote.invalidate({ bracketId: match.id });
      utils.brackets.getVotes.invalidate({ bracketId: match.id, eventId });
      utils.brackets.getForEvent.invalidate({ eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const adminAdjust = trpc.brackets.adminAdjustVote.useMutation({
    onSuccess: () => {
      toast.success("Vote adjusted");
      utils.brackets.getVotes.invalidate({ bracketId: match.id, eventId });
      utils.brackets.getForEvent.invalidate({ eventId });
    },
    onError: (err) => toast.error(err.message),
  });

  const book1Votes = votes?.filter((v) => v.bookId === match.book1Id).length ?? 0;
  const book2Votes = votes?.filter((v) => v.bookId === match.book2Id).length ?? 0;
  const totalVotesCast = (votes?.length ?? 0);
  const canVote = match.status === "voting" && !myVote && eventStatus === "voting";
  const canUndo = myVote && match.status === "voting" && !match.winnerId;

  // Per-book tallies: only show after matchup is resolved
  // During voting: show participation indicator ("X of Y voted") instead
  const isResolved = match.status === "completed";
  const showPerBookTallies = isResolved;

  const borderClass = isFinal
    ? "border-2 border-amber-400/50 shadow-lg shadow-amber-100/50"
    : match.status === "voting"
      ? "border-primary/40 shadow-sm"
      : match.status === "completed"
        ? "border-muted opacity-80"
        : "border-border";

  const confirmBook = confirmBookId === match.book1Id ? match.book1 : confirmBookId === match.book2Id ? match.book2 : null;

  return (
    <div className={`rounded-xl border bg-card text-card-foreground overflow-hidden ${borderClass}`}>
      {/* Status indicator */}
      <div className={`h-1 ${
        match.status === "voting"
          ? "bg-amber-400"
          : match.status === "completed"
            ? "bg-emerald-500"
            : "bg-muted"
      }`} />

      {/* Book 1 slot */}
      <BookSlot
        book={match.book1}
        seed={match.book1Seed}
        isWinner={match.winnerId === match.book1Id}
        isMyVote={myVote?.bookId === match.book1Id}
        voteCount={showPerBookTallies ? book1Votes : undefined}
        canVote={canVote}
        onVote={() => match.book1Id && setConfirmBookId(match.book1Id)}
      />

      {/* VS divider with participation indicator */}
      <div className="flex items-center gap-2 px-3">
        <div className="flex-1 h-px bg-border" />
        {match.status === "voting" ? (
          <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
            {totalVotesCast} of {totalMembers} voted
          </span>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground tracking-widest">VS</span>
        )}
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Book 2 slot */}
      <BookSlot
        book={match.book2}
        seed={match.book2Seed}
        isWinner={match.winnerId === match.book2Id}
        isMyVote={myVote?.bookId === match.book2Id}
        voteCount={showPerBookTallies ? book2Votes : undefined}
        canVote={canVote}
        onVote={() => match.book2Id && setConfirmBookId(match.book2Id)}
      />

      {/* Undo vote button */}
      {canUndo && (
        <div className="px-2 pb-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7 gap-1"
            onClick={() => undoVote.mutate({ bracketId: match.id, eventId })}
            disabled={undoVote.isPending}
          >
            {undoVote.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
            Undo Vote
          </Button>
        </div>
      )}

      {/* Admin resolve button */}
      {isAdmin && match.status === "voting" && eventStatus === "voting" && (
        <div className="p-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7"
            onClick={onResolve}
            disabled={isResolving}
          >
            {isResolving ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Trophy className="h-3 w-3 mr-1" />
            )}
            Resolve
          </Button>
        </div>
      )}

      {/* Vote confirmation dialog */}
      <AlertDialog open={confirmBookId !== null} onOpenChange={(open) => !open && setConfirmBookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your vote</AlertDialogTitle>
            <AlertDialogDescription>
              You are voting for <strong>{confirmBook?.title ?? "this book"}</strong> by {confirmBook?.author ?? "unknown author"}. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmBookId) onVote(confirmBookId);
                setConfirmBookId(null);
              }}
              disabled={isVoting}
            >
              {isVoting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Vote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BookSlot({
  book,
  seed,
  isWinner,
  isMyVote,
  voteCount,
  canVote,
  onVote,
}: {
  book: any;
  seed: number | null;
  isWinner: boolean;
  isMyVote: boolean;
  voteCount?: number;
  canVote: boolean;
  onVote: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 transition-colors ${
        canVote ? "cursor-pointer hover:bg-accent/60" : ""
      } ${isWinner ? "bg-emerald-50 dark:bg-emerald-950/30" : ""} ${
        isMyVote ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
      }`}
      onClick={() => canVote && onVote()}
    >
      {/* Cover thumbnail */}
      {book?.coverUrl ? (
        <img
          src={book.coverUrl}
          alt={book.title}
          className="h-10 w-7 rounded object-cover shrink-0 shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="h-10 w-7 rounded bg-muted flex items-center justify-center shrink-0 text-[8px] text-muted-foreground">
          {book ? "📖" : "?"}
        </div>
      )}

      <div className="min-w-0 flex-1">
        {book ? (
          <>
            <p className="text-sm font-medium truncate leading-tight">
              {seed && (
                <span className="text-[10px] text-muted-foreground font-normal mr-1">
                  #{seed}
                </span>
              )}
              {book.title}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{book.author}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">TBD</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isWinner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
        {voteCount !== undefined && (
          <span className="text-xs font-bold tabular-nums min-w-[1.2rem] text-right">
            {voteCount}
          </span>
        )}
      </div>
    </div>
  );
}
