import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, Loader2, Star, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          <Star
            className={`h-6 w-6 ${
              star <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const bookId = Number(id);
  const { user } = useAuth();
  const { activeGroup } = useGroup();
  const activeGroupId = activeGroup?.id;
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: book, isLoading } = trpc.books.getById.useQuery({ id: bookId });
  const { data: reviews } = trpc.reviews.listForBook.useQuery(
    { groupId: activeGroupId!, bookId },
    { enabled: !!activeGroupId }
  );
  const { data: avgRating } = trpc.reviews.averageRating.useQuery(
    { groupId: activeGroupId!, bookId },
    { enabled: !!activeGroupId }
  );

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const submitReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Review submitted!");
      setRating(0);
      setReviewText("");
      utils.reviews.listForBook.invalidate({ groupId: activeGroupId!, bookId });
      utils.reviews.averageRating.invalidate({ groupId: activeGroupId!, bookId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container max-w-3xl py-8">
        <p className="text-muted-foreground">Book not found</p>
      </div>
    );
  }

  const myReview = reviews?.find((r) => r.userId === user?.id);

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/books")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Books
      </Button>

      {/* Book Info */}
      <div className="flex gap-6">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-48 w-32 rounded-lg object-cover shadow-md shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="h-48 w-32 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="text-lg text-muted-foreground">{book.author}</p>
          {book.genre && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{book.genre}</span>}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {book.pageCount && <span>{book.pageCount} pages</span>}
            {book.isbn && <span>ISBN: {book.isbn}</span>}
            {book.hasBeenRead && <span className="text-emerald-600 font-medium">Read by club</span>}
          </div>
          {avgRating && (
            <div className="flex items-center gap-2 mt-2">
              <StarRating value={Math.round(avgRating.average)} readonly />
              <span className="text-sm font-medium">{avgRating.average}</span>
              <span className="text-sm text-muted-foreground">({avgRating.count} review{avgRating.count !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>
      </div>

      {book.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{book.description}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Write a Review */}
      {activeGroupId && !myReview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Write a Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Your Rating</Label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review">Review (optional)</Label>
              <textarea
                id="review"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your thoughts about this book..."
                className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={2000}
              />
            </div>
            <Button
              onClick={() => submitReview.mutate({ groupId: activeGroupId, bookId, rating, reviewText: reviewText || undefined })}
              disabled={rating === 0 || submitReview.isPending}
            >
              {submitReview.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Review
            </Button>
          </CardContent>
        </Card>
      )}

      {myReview && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Your Review</CardTitle>
          </CardHeader>
          <CardContent>
            <StarRating value={myReview.rating} readonly />
            {myReview.reviewText && <p className="mt-3 text-sm">{myReview.reviewText}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(myReview.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* All Reviews */}
      {reviews && reviews.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Reviews ({reviews.length})
          </h2>
          {reviews
            .filter((r) => r.userId !== user?.id)
            .map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {(review.userName ?? "?")[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{review.userName ?? "Anonymous"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <StarRating value={review.rating} readonly />
                  {review.reviewText && <p className="mt-2 text-sm">{review.reviewText}</p>}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
