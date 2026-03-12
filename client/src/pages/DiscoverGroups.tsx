import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import { Globe, Loader2, Search, Users, BookOpen, Tag } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const GENRE_TAGS = [
  "Sci-Fi", "Fantasy", "Mystery", "Romance", "Horror", "Thriller",
  "Literary Fiction", "Non-Fiction", "Biography", "History",
  "Philosophy", "Science", "Self-Help", "Poetry", "Classics",
  "Young Adult", "Graphic Novels", "True Crime", "Humor", "Travel",
];

function parseTags(tags: unknown): string[] {
  if (!tags) return [];
  try {
    const parsed = typeof tags === "string" ? JSON.parse(tags) : tags;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DiscoverGroups() {
  const { data: publicGroups, isLoading } = trpc.groups.publicGroups.useQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { setActiveGroupId, refetchGroups } = useGroup();
  const utils = trpc.useUtils();

  const joinGroup = trpc.groups.joinPublic.useMutation({
    onSuccess: (_data, variables) => {
      toast.success("You joined the group!");
      refetchGroups();
      setActiveGroupId(variables.groupId);
      utils.groups.publicGroups.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Collect all tags used by public groups
  const availableTags = useMemo(() => {
    if (!publicGroups) return [];
    const tagSet = new Set<string>();
    publicGroups.forEach((g) => {
      parseTags(g.tags).forEach((t) => tagSet.add(t));
    });
    return GENRE_TAGS.filter((t) => tagSet.has(t));
  }, [publicGroups]);

  const filteredGroups = useMemo(() => {
    if (!publicGroups) return [];
    let result = publicGroups;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.description && g.description.toLowerCase().includes(q)) ||
          parseTags(g.tags).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedTag) {
      result = result.filter((g) => parseTags(g.tags).includes(selectedTag));
    }
    return result;
  }, [publicGroups, searchQuery, selectedTag]);

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Discover Groups
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse and join public book clubs
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search public groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tag Filters */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Tag className="h-4 w-4" />
            <span>Filter by genre</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedTag === null ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedTag(null)}
            >
              All
            </Badge>
            {availableTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {searchQuery.trim() || selectedTag
                ? "No groups match your filters"
                : "No public groups yet"}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
              {searchQuery.trim() || selectedTag
                ? "Try a different search term or clear filters"
                : "Be the first to create a public book club! Toggle \"Public Group\" when creating a new group."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const groupTags = parseTags(group.tags);
            return (
              <Card key={group.id} className="hover:shadow-md transition-shadow overflow-hidden">
                {group.coverUrl && (
                  <div className="h-32 w-full overflow-hidden">
                    <img
                      src={group.coverUrl}
                      alt={`${group.name} cover`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className={group.coverUrl ? "pb-3 pt-4" : "pb-3"}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{group.name}</span>
                      </CardTitle>
                      {group.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {group.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => joinGroup.mutate({ groupId: group.id })}
                      disabled={joinGroup.isPending}
                    >
                      {joinGroup.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Join"
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {groupTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {groupTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {Number(group.memberCount)} member{Number(group.memberCount) !== 1 ? "s" : ""}
                    </span>
                    <span>
                      Created {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
