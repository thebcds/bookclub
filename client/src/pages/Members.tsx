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
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import { Check, Copy, Loader2, Plus, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MembersPage() {
  const { activeGroup, isGroupAdmin } = useGroup();
  const gid = activeGroup?.id ?? 0;
  const { data: members, isLoading } = trpc.members.list.useQuery(
    { groupId: gid },
    { enabled: !!activeGroup }
  );
  const { data: invitations } = trpc.invitations.list.useQuery(
    { groupId: gid },
    { enabled: !!activeGroup && isGroupAdmin }
  );
  const [showInvite, setShowInvite] = useState(false);

  if (!activeGroup) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>Select a group to view members</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Members</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeGroup.name} members and invitations
          </p>
        </div>
        {isGroupAdmin && (
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
                groupId={gid}
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
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Invitations */}
      {isGroupAdmin && invitations && invitations.length > 0 && (
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

function InviteForm({ groupId, onSuccess }: { groupId: number; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const utils = trpc.useUtils();

  const createInvite = trpc.invitations.create.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(link);
      toast.success("Invitation created!");
      utils.invitations.list.invalidate({ groupId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvite.mutate({
      groupId,
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
          onValueChange={(v) => setRole(v as "member" | "admin")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
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
