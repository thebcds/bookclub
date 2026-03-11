import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GENRES = [
  "Fiction",
  "Non-Fiction",
  "Mystery",
  "Sci-Fi",
  "Fantasy",
  "Romance",
  "Thriller",
  "Horror",
  "Biography",
  "History",
  "Self-Help",
  "Philosophy",
  "Poetry",
  "Classic",
  "Young Adult",
];

type VotingScheme = "tournament" | "simple_majority" | "ranked_choice" | "no_vote";

const SCHEME_DESCRIPTIONS: Record<VotingScheme, string> = {
  tournament:
    "Books are seeded into a bracket and members vote on each matchup. Previously submitted books get seeding advantages.",
  simple_majority:
    "Each member votes for one book. The book with the most votes wins.",
  ranked_choice:
    "Members rank all books. Lowest-ranked books are eliminated until one has a majority.",
  no_vote:
    "No voting takes place. Use for single-title selection or random pick from submissions.",
};

export default function NewEventPage() {
  const [, setLocation] = useLocation();
  const { activeGroup } = useGroup();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [votingScheme, setVotingScheme] = useState<VotingScheme>("tournament");
  const [maxPageCount, setMaxPageCount] = useState("");
  const [allowPreviouslyRead, setAllowPreviouslyRead] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [minRating, setMinRating] = useState("");
  const [anonymousSubmissions, setAnonymousSubmissions] = useState(false);
  const [maxTotalSubmissions, setMaxTotalSubmissions] = useState("8");
  const [maxSubmissionsPerMember, setMaxSubmissionsPerMember] = useState("1");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [votingDeadline, setVotingDeadline] = useState("");
  const [readingDeadline, setReadingDeadline] = useState("");

  const createEvent = trpc.events.create.useMutation({
    onSuccess: (data) => {
      toast.success("Event created!");
      setLocation(`/events/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!activeGroup) return;

    const totalSubs = parseInt(maxTotalSubmissions) || 8;
    const perMember = parseInt(maxSubmissionsPerMember) || 1;

    if (perMember > totalSubs) {
      toast.error("Per-member limit cannot exceed total submissions");
      return;
    }

    createEvent.mutate({
      groupId: activeGroup.id,
      title: title.trim(),
      description: description.trim() || undefined,
      votingScheme,
      maxPageCount: maxPageCount ? parseInt(maxPageCount) : undefined,
      allowPreviouslyRead,
      allowedGenres: selectedGenres.length > 0 ? selectedGenres : undefined,
      minRating: minRating ? parseInt(minRating) : undefined,
      anonymousSubmissions,
      maxTotalSubmissions: totalSubs,
      maxSubmissionsPerMember: perMember,
      submissionDeadline: submissionDeadline
        ? new Date(submissionDeadline)
        : undefined,
      votingDeadline: votingDeadline ? new Date(votingDeadline) : undefined,
      readingDeadline: readingDeadline ? new Date(readingDeadline) : undefined,
    });
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const isSingleTitle = votingScheme === "no_vote" && parseInt(maxTotalSubmissions) === 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/events")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-serif font-bold">New Event</h1>
          <p className="text-muted-foreground text-sm">
            Create a book selection event
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="March Book Selection"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Selection Method</Label>
              <Select
                value={votingScheme}
                onValueChange={(v) => {
                  setVotingScheme(v as VotingScheme);
                  if (v === "no_vote") {
                    setMaxTotalSubmissions("1");
                    setMaxSubmissionsPerMember("1");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tournament">
                    Tournament Bracket
                  </SelectItem>
                  <SelectItem value="simple_majority">
                    Simple Majority
                  </SelectItem>
                  <SelectItem value="ranked_choice">
                    Ranked Choice
                  </SelectItem>
                  <SelectItem value="no_vote">
                    No Vote (Direct Selection)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {SCHEME_DESCRIPTIONS[votingScheme]}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission Quantity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="maxTotalSubs">Total Submissions</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      The maximum number of book titles that can be submitted to this event.
                      {votingScheme === "no_vote" && " Set to 1 for a single-title direct selection with no voting."}
                      {votingScheme === "tournament" && " For tournament brackets, 8 is the standard."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="maxTotalSubs"
                type="number"
                min={votingScheme === "no_vote" ? "1" : "2"}
                max="64"
                value={maxTotalSubmissions}
                onChange={(e) => setMaxTotalSubmissions(e.target.value)}
              />
              {isSingleTitle && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Single-title mode: The event will auto-complete when one book is submitted. No voting will occur.
                </p>
              )}
              {votingScheme === "no_vote" && parseInt(maxTotalSubmissions) > 1 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Multiple submissions with no vote: A winner will be randomly selected when all submissions are in.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="maxPerMember">Submissions Per Member</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      How many books each member can submit. Set to 1 for one book per person, or higher to allow multiple submissions per member.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="maxPerMember"
                type="number"
                min="1"
                max={maxTotalSubmissions}
                value={maxSubmissionsPerMember}
                onChange={(e) => setMaxSubmissionsPerMember(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxPages">Maximum Page Count</Label>
              <Input
                id="maxPages"
                type="number"
                value={maxPageCount}
                onChange={(e) => setMaxPageCount(e.target.value)}
                placeholder="No limit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minRating">Minimum Rating (0-100)</Label>
              <Input
                id="minRating"
                type="number"
                min="0"
                max="100"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                placeholder="No minimum"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Previously Read Books</Label>
                <p className="text-xs text-muted-foreground">
                  Allow books the club has already read
                </p>
              </div>
              <Switch
                checked={allowPreviouslyRead}
                onCheckedChange={setAllowPreviouslyRead}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Anonymous Submissions</Label>
                <p className="text-xs text-muted-foreground">
                  Hide who submitted each book
                </p>
              </div>
              <Switch
                checked={anonymousSubmissions}
                onCheckedChange={setAnonymousSubmissions}
              />
            </div>
            <div className="space-y-2">
              <Label>Allowed Genres</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Leave empty to allow all genres
              </p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <Button
                    key={genre}
                    type="button"
                    variant={
                      selectedGenres.includes(genre) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => toggleGenre(genre)}
                    className="text-xs"
                  >
                    {genre}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subDeadline">Submission Deadline</Label>
              <Input
                id="subDeadline"
                type="datetime-local"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
              />
            </div>
            {votingScheme !== "no_vote" && (
              <div className="space-y-2">
                <Label htmlFor="voteDeadline">Voting Deadline</Label>
                <Input
                  id="voteDeadline"
                  type="datetime-local"
                  value={votingDeadline}
                  onChange={(e) => setVotingDeadline(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="readDeadline">Reading Deadline</Label>
              <Input
                id="readDeadline"
                type="datetime-local"
                value={readingDeadline}
                onChange={(e) => setReadingDeadline(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          disabled={createEvent.isPending}
        >
          {createEvent.isPending && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          Create Event
        </Button>
      </form>
    </div>
  );
}
