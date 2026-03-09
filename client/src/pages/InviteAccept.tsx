import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: verification, isLoading } = trpc.invitations.verify.useQuery(
    { token },
    { enabled: !!token }
  );

  const acceptMutation = trpc.invitations.accept.useMutation({
    onSuccess: () => {
      toast.success("Welcome to the book club!");
      setLocation("/");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-48 w-96" />
      </div>
    );
  }

  if (!verification?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-xl font-serif font-bold">
              Invalid Invitation
            </h2>
            <p className="text-muted-foreground text-sm">
              This invitation link is invalid or has expired.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-serif font-bold">
              You&apos;re Invited!
            </h2>
            <p className="text-muted-foreground text-sm">
              Sign in to accept your book club invitation.
            </p>
            <Button
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              className="w-full"
            >
              Sign in to Accept
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-serif font-bold">
            Join the Book Club
          </h2>
          <p className="text-muted-foreground text-sm">
            You&apos;ve been invited to join the book club. Click below to
            accept.
          </p>
          <Button
            className="w-full"
            onClick={() => acceptMutation.mutate({ token })}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Accept Invitation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
