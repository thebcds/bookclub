import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { BookOpen, Loader2, Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
  const [showResults, setShowResults] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading } = trpc.openLibrary.search.useQuery(
    { query: searchTerm },
    { enabled: searchTerm.length > 0 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchTerm(query.trim());
      setShowResults(true);
    }
  };

  const handleSelect = (book: OpenLibraryResult) => {
    onSelect({
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl ?? undefined,
      pageCount: book.pageCount ?? undefined,
      isbn: book.isbn ?? undefined,
      genre: book.genres[0] ?? undefined,
    });
    setShowResults(false);
    setQuery("");
    setSearchTerm("");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = results && results.length > 0 && showResults;
  const hasNoResults = results && results.length === 0 && searchTerm && showResults;

  return (
    <div className="relative" ref={containerRef}>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search Open Library..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setShowResults(false);
              }
            }}
            onFocus={() => {
              if (results && results.length > 0) setShowResults(true);
            }}
          />
        </div>
        <Button type="submit" size="sm" disabled={isLoading || !query.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {/* Dropdown results - absolutely positioned */}
      {(hasResults || isLoading || hasNoResults) && showResults && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover text-popover-foreground border rounded-lg shadow-lg">
          {isLoading && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Searching...</span>
            </div>
          )}

          {hasResults && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 z-10"
                onClick={() => setShowResults(false)}
              >
                <X className="h-3 w-3" />
              </Button>
              <ScrollArea className="max-h-[280px]">
                <div className="p-2 space-y-1">
                  {(results as OpenLibraryResult[]).map((book) => (
                    <div
                      key={book.key}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleSelect(book)}
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="h-12 w-8 rounded object-cover shrink-0 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-12 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <BookOpen className="h-4 w-4 text-primary" />
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
            </div>
          )}

          {hasNoResults && (
            <div className="text-center py-3 text-muted-foreground text-sm">
              No results found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
