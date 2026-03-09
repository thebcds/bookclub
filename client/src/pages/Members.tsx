import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Check, Copy, Loader2, Plus, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MembersPage() {
  const { user } = useAuth();
  const { data: members, isLoading } = trpc.members.list.useQuery();
  const { data: invitations } = trpc.invitations.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Members</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Club members and invitations
          </p>
        </div>
        {user?.role === "admin" && (
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a Member</DialogTitle>
              </DialogHeader>
              <InviteForm
                onSuccess={() => setShowInvite(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {members?.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(member.name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    {member.name ?? "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.email ?? "No email"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {member.role === "admin" && (
                    <Badge className="bg-primary/10 text-primary">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Joined{" "}
                    {new Date(member.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Invitations */}
      {user?.role === "admin" && invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {inv.email || "Link invitation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InviteForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const utils = trpc.useUtils();

  const createInvite = trpc.invitations.create.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(link);
      toast.success("Invitation created!");
      utils.invitations.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvite.mutate({
      email: email.trim() || undefined,
      role,
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (inviteLink) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share this link with the person you want to invite:
        </p>
        <div className="flex items-center gap-2">
          <Input value={inviteLink} readOnly className="text-xs" />
          <Button variant="outline" size="icon" onClick={copyLink}>
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This link expires in 7 days.
        </p>
        <Button variant="outline" className="w-full" onClick={onSuccess}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Email (optional)</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@example.com"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to generate a shareable invite link
        </p>
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as "user" | "admin")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={createInvite.isPending}
      >
        {createInvite.isPending && (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        )}
        Create Invitation
      </Button>
    </form>
  );
}
