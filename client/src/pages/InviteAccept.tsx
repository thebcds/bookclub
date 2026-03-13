import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [accepted, setAccepted] = useState(false);

  const { data: verification, isLoading, error: verifyError } = trpc.invitations.verify.useQuery(
    { token },
    { enabled: !!token, retry: 2 }
  );

  const acceptMutation = trpc.invitations.accept.useMutation({
    onSuccess: (data) => {
      setAccepted(true);
      toast.success("Welcome to the group!");
      // Store the group ID so GroupContext picks it up
      if (data.groupId) {
        localStorage.setItem("bookclub-active-group", data.groupId.toString());
      }
      // Small delay to let the toast show, then redirect
      setTimeout(() => setLocation("/"), 800);
    },
    onError: (err) => {
      if (err.message.includes("already a member") || err.message.includes("Invalid or expired")) {
        // If already a member, just redirect to the group
        toast.info("You're already a member of this group!");
        if (verification?.invitation?.groupId) {
          localStorage.setItem("bookclub-active-group", verification.invitation.groupId.toString());
        }
        setTimeout(() => setLocation("/"), 800);
      } else {
        toast.error(err.message);
      }
    },
  });

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-48 w-96" />
      </div>
    );
  }

  if (verifyError || !verification?.valid) {
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
              This invitation link is invalid, has expired, or has already been used.
            </p>
            {user ? (
              <Button variant="outline" onClick={() => setLocation("/")}>
                Go to Dashboard
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = getLoginUrl("/");
                }}
              >
                Sign In
              </Button>
            )}
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
              You&apos;ve been invited to join{" "}
              <strong>{verification.invitation?.groupName || "a group"}</strong>.
              Sign in to accept the invitation.
            </p>
            <Button
              onClick={() => {
                // Pass the current invite path so user returns here after login
                window.location.href = getLoginUrl(`/invite/${token}`);
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

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-serif font-bold">
              Welcome!
            </h2>
            <p className="text-muted-foreground text-sm">
              You&apos;ve joined {verification.invitation?.groupName || "the group"}. Redirecting to dashboard...
            </p>
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
            Join {verification.invitation?.groupName || "the group"}
          </h2>
          <p className="text-muted-foreground text-sm">
            You&apos;ve been invited to join {verification.invitation?.groupName || "the group"}. Click below to
            accept.
          </p>
          <p className="text-xs text-muted-foreground">
            Signed in as <strong>{user.name || user.email}</strong>
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
