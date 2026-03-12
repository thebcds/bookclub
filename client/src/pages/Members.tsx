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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import { Check, CheckCircle2, Copy, History, Loader2, Plus, Shield, Trash2, UserMinus, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MembersPage() {
  const { user } = useAuth();
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
  const { data: invitationHistory } = trpc.invitations.history.useQuery(
    { groupId: gid },
    { enabled: !!activeGroup && isGroupAdmin }
  );
  const { data: group } = trpc.groups.getById.useQuery(
    { id: gid },
    { enabled: !!activeGroup }
  );
  const [showInvite, setShowInvite] = useState(false);
  const utils = trpc.useUtils();

  const removeMember = trpc.groupSettings.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.members.list.invalidate({ groupId: gid });
    },
    onError: (err) => toast.error(err.message),
  });

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
                Invite Members
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Invite Members</DialogTitle>
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
                  {isGroupAdmin && member.id !== user?.id && member.id !== group?.createdBy && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      onClick={() => {
                        if (confirm(`Remove ${member.name ?? "this member"} from the group?`)) {
                          removeMember.mutate({ groupId: gid, userId: member.id });
                        }
                      }}
                      disabled={removeMember.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
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
                <InvitationRow key={inv.id} invitation={inv} groupId={gid} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accepted Invitation History */}
      {isGroupAdmin && invitationHistory && invitationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Invitation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitationHistory.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {inv.email || "Link invitation"}
                      </p>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Accepted
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Invited by {inv.invitedByName ?? "Unknown"}
                      {inv.acceptedByName && <> &middot; Accepted by <strong>{inv.acceptedByName}</strong></>}
                      {" "}&middot; {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {inv.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvitationRow({ invitation, groupId }: { invitation: { id: number; token: string; email: string | null; expiresAt: Date }; groupId: number }) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}/invite/${invitation.token}`;
  const utils = trpc.useUtils();

  const revokeMutation = trpc.invitations.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      utils.invitations.list.invalidate({ groupId });
    },
    onError: (err) => toast.error(err.message),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {invitation.email || "Link invitation"}
        </p>
        <p className="text-xs text-muted-foreground">
          Expires {new Date(invitation.expiresAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
          {copied ? (
            <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</>
          ) : (
            <><Copy className="h-3.5 w-3.5" /> Copy Link</>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => revokeMutation.mutate({ groupId, invitationId: invitation.id })}
          disabled={revokeMutation.isPending}
          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {revokeMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <><X className="h-3.5 w-3.5" /> Revoke</>
          )}
        </Button>
        <Badge variant="outline">Pending</Badge>
      </div>
    </div>
  );
}

function InviteForm({ groupId, onSuccess }: { groupId: number; onSuccess: () => void }) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [email, setEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [inviteLink, setInviteLink] = useState("");
  const [bulkResults, setBulkResults] = useState<{ email: string; token: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedBulk, setCopiedBulk] = useState<string | null>(null);
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

  const bulkCreate = trpc.invitations.bulkCreate.useMutation({
    onSuccess: (data) => {
      setBulkResults(data.map(d => ({ email: d.email, token: d.token })));
      toast.success(`${data.length} invitation(s) created!`);
      utils.invitations.list.invalidate({ groupId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvite.mutate({
      groupId,
      email: email.trim() || undefined,
      role,
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0 && e.includes("@"));
    if (emails.length === 0) {
      toast.error("Please enter at least one valid email address");
      return;
    }
    if (emails.length > 50) {
      toast.error("Maximum 50 emails at a time");
      return;
    }
    bulkCreate.mutate({ groupId, emails, role });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyBulkLink = (token: string, email: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedBulk(email);
    toast.success(`Link for ${email} copied!`);
    setTimeout(() => setCopiedBulk(null), 2000);
  };

  const copyAllBulkLinks = () => {
    const allLinks = bulkResults
      .map(r => `${r.email}: ${window.location.origin}/invite/${r.token}`)
      .join("\n");
    navigator.clipboard.writeText(allLinks);
    toast.success("All invite links copied!");
  };

  // Single invite result
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

  // Bulk invite results
  if (bulkResults.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {bulkResults.length} invitation(s) created:
          </p>
          <Button variant="outline" size="sm" onClick={copyAllBulkLinks} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            Copy All Links
          </Button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {bulkResults.map((r) => (
            <div key={r.email} className="flex items-center justify-between p-2 rounded border text-sm">
              <span className="truncate flex-1 mr-2">{r.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyBulkLink(r.token, r.email)}
                className="gap-1 shrink-0 h-7"
              >
                {copiedBulk === r.email ? (
                  <><Check className="h-3 w-3 text-emerald-600" /> Copied</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy</>
                )}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          All links expire in 7 days.
        </p>
        <Button variant="outline" className="w-full" onClick={onSuccess}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "bulk")}>
        <TabsList className="w-full">
          <TabsTrigger value="single" className="flex-1">Single Invite</TabsTrigger>
          <TabsTrigger value="bulk" className="flex-1">Bulk Invite</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <form onSubmit={handleSingleSubmit} className="space-y-4">
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
        </TabsContent>

        <TabsContent value="bulk">
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email Addresses</Label>
              <Textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder={"alice@example.com\nbob@example.com\ncharlie@example.com"}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Enter one email per line, or separate with commas. Max 50 at a time.
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
              disabled={bulkCreate.isPending}
            >
              {bulkCreate.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create {bulkEmails.split(/[\n,;]+/).filter(e => e.trim().includes("@")).length || 0} Invitation(s)
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
