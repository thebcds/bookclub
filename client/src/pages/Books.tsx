import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import { BookOpen, Search } from "lucide-react";
import { useState } from "react";

function BookCover({ coverUrl, title }: { coverUrl?: string | null; title: string }) {
  const [imgError, setImgError] = useState(false);
  if (coverUrl && !imgError) {
    return (
      <img
        src={coverUrl}
        alt={title}
        className="h-20 w-14 rounded-lg object-cover shadow-sm shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="h-20 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <BookOpen className="h-6 w-6 text-primary" />
    </div>
  );
}

export default function BooksPage() {
  const { activeGroup } = useGroup();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: allBooks, isLoading } = trpc.books.list.useQuery(
    { groupId: activeGroup?.id ?? 0 },
    { enabled: !!activeGroup }
  );
  const { data: readBooks, isLoading: readLoading } = trpc.books.readBooks.useQuery(
    { groupId: activeGroup?.id ?? 0 },
    { enabled: !!activeGroup }
  );

  if (!activeGroup) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>Select a group to view books</p>
      </div>
    );
  }

  const filteredBooks = allBooks?.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const BookCard = ({ book }: { book: NonNullable<typeof allBooks>[0] }) => (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <BookCover coverUrl={book.coverUrl} title={book.title} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{book.title}</p>
          <p className="text-sm text-muted-foreground">{book.author}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {book.genre && (
              <Badge variant="secondary" className="text-xs">
                {book.genre}
              </Badge>
            )}
            {book.pageCount && (
              <span className="text-xs text-muted-foreground">
                {book.pageCount} pages
              </span>
            )}
            {book.rating && (
              <span className="text-xs text-muted-foreground">
                Rating: {book.rating}/100
              </span>
            )}
          </div>
        </div>
        {book.hasBeenRead && (
          <Badge className="bg-emerald-100 text-emerald-800 shrink-0">
            Read
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Books</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All books submitted to {activeGroup.name}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search books by title or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({allBooks?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({readBooks?.length ?? 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredBooks && filteredBooks.length > 0 ? (
            <div className="grid gap-3">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>
                {searchQuery ? "No books match your search" : "No books yet"}
              </p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="read" className="mt-4">
          {readLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : readBooks && readBooks.length > 0 ? (
            <div className="grid gap-3">
              {readBooks.map((book) => (
                <Card key={book.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <BookCover coverUrl={book.coverUrl} title={book.title} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{book.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {book.author}
                      </p>
                      {book.readDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Read on{" "}
                          {new Date(book.readDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No books read yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
