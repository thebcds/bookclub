import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { BookOpen, Loader2, Search } from "lucide-react";
import { useState } from "react";

type OpenLibraryResult = {
  key: string;
  title: string;
  author: string;
  coverId: number | null;
  coverUrl: string | null;
  year: number | null;
  pageCount: number | null;
  isbn: string | null;
  genres: string[];
};

type Props = {
  onSelect: (book: {
    title: string;
    author: string;
    coverUrl?: string;
    pageCount?: number;
    isbn?: string;
    genre?: string;
  }) => void;
};

export default function OpenLibrarySearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: results, isLoading } = trpc.openLibrary.search.useQuery(
    { query: searchTerm },
    { enabled: searchTerm.length > 0 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchTerm(query.trim());
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search Open Library..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={isLoading || !query.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Searching Open Library...
        </div>
      )}

      {results && results.length > 0 && (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2 pr-3">
            {(results as OpenLibraryResult[]).map((book) => (
              <div
                key={book.key}
                className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() =>
                  onSelect({
                    title: book.title,
                    author: book.author,
                    coverUrl: book.coverUrl ?? undefined,
                    pageCount: book.pageCount ?? undefined,
                    isbn: book.isbn ?? undefined,
                    genre: book.genres[0] ?? undefined,
                  })
                }
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="h-14 w-10 rounded object-cover shrink-0 shadow-sm"
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
                  <p className="font-medium text-sm truncate">{book.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {book.author}
                    {book.year && ` (${book.year})`}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {book.pageCount && (
                      <span className="text-[10px] text-muted-foreground">
                        {book.pageCount} pages
                      </span>
                    )}
                    {book.genres[0] && (
                      <span className="text-[10px] text-muted-foreground">
                        {book.genres[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {results && results.length === 0 && searchTerm && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No results found. Try a different search term.
        </div>
      )}
    </div>
  );
}
