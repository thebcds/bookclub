import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Camera, Crown, Globe, Loader2, Lock, Save, Shield, Trash2, UserMinus, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function GroupSettings() {
  const { user } = useAuth();
  const { activeGroup, setActiveGroupId } = useGroup();
  const activeGroupId = activeGroup?.id;
  const [, navigate] = useLocation();

  const { data: group, isLoading: groupLoading } = trpc.groups.getById.useQuery(
    { id: activeGroupId! },
    { enabled: !!activeGroupId }
  );
  const { data: members } = trpc.members.list.useQuery(
    { groupId: activeGroupId! },
    { enabled: !!activeGroupId }
  );
  const { data: membership } = trpc.members.myMembership.useQuery(
    { groupId: activeGroupId! },
    { enabled: !!activeGroupId }
  );

  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? "");
      setIsPublic(group.isPublic ?? false);
      setCoverPreview(group.coverUrl ?? null);
    }
  }, [group]);

  const uploadCover = trpc.groups.uploadCover.useMutation({
    onSuccess: (data) => {
      toast.success("Cover image updated");
      setCoverPreview(data.url);
      utils.groups.getById.invalidate({ id: activeGroupId! });
      utils.groups.myGroups.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadCover.mutate({ groupId: activeGroupId!, imageData: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const updateGroup = trpc.groups.update.useMutation({
    onSuccess: () => {
      toast.success("Group settings updated");
      utils.groups.getById.invalidate({ id: activeGroupId! });
      utils.groups.myGroups.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMember = trpc.groupSettings.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.members.list.invalidate({ groupId: activeGroupId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const transferOwnership = trpc.groupSettings.transferOwnership.useMutation({
    onSuccess: () => {
      toast.success("Ownership transferred");
      utils.groups.getById.invalidate({ id: activeGroupId! });
      utils.members.list.invalidate({ groupId: activeGroupId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteGroupMut = trpc.groupSettings.delete.useMutation({
    onSuccess: () => {
      toast.success("Group deleted");
      if (groups.length > 0) setActiveGroupId(groups[0].id);
      utils.groups.myGroups.invalidate();
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });

  const { groups } = useGroup();

  const leaveGroup = trpc.groupSettings.leave.useMutation({
    onSuccess: () => {
      toast.success("You left the group");
      if (groups.length > 0) setActiveGroupId(groups[0].id);
      utils.groups.myGroups.invalidate();
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!activeGroupId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a group first</p>
      </div>
    );
  }

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isOwner = group?.createdBy === user?.id;
  const isAdmin = membership?.role === "admin";
  const otherMembers = members?.filter((m) => m.id !== user?.id) ?? [];

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Group Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your group settings</p>
      </div>

      {/* General Settings */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              General
            </CardTitle>
            <CardDescription>Update your group name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cover Image */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="relative rounded-lg border overflow-hidden bg-muted/30">
                {coverPreview ? (
                  <img src={coverPreview} alt="Group cover" className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center text-muted-foreground">
                    <Camera className="h-8 w-8 opacity-40" />
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-white text-sm font-medium flex items-center gap-2">
                    {uploadCover.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {coverPreview ? "Change Cover" : "Upload Cover"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadCover.isPending} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Recommended: 1200x400px, max 5MB. Visible on the Discover page for public groups.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Reading Group" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of your group" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="h-5 w-5 text-primary" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="group-public-setting" className="text-sm font-medium cursor-pointer">
                    {isPublic ? "Public Group" : "Private Group"}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPublic
                      ? "Anyone can find and join this group from the Discover page"
                      : "Only invited members can join this group"}
                  </p>
                </div>
              </div>
              <Switch
                id="group-public-setting"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            <Button
              onClick={() => updateGroup.mutate({ groupId: activeGroupId, name, description, isPublic })}
              disabled={updateGroup.isPending || !name.trim()}
            >
              {updateGroup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Member Management */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Members
            </CardTitle>
            <CardDescription>Manage group members and their roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {(member.name ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {member.name ?? "Unknown"}
                        {group?.createdBy === member.id && (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{member.email ?? "No email"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${member.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {member.role}
                    </span>
                    {member.id !== user?.id && member.id !== group?.createdBy && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeMember.mutate({ groupId: activeGroupId, userId: member.id })}
                        disabled={removeMember.isPending}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer Ownership */}
      {isOwner && otherMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Transfer Ownership
            </CardTitle>
            <CardDescription>Transfer group ownership to another member. This cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={transferTarget} onValueChange={setTransferTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {otherMembers.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name ?? "Unknown"} ({m.email ?? "no email"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                if (transferTarget) {
                  transferOwnership.mutate({ groupId: activeGroupId, newOwnerId: Number(transferTarget) });
                }
              }}
              disabled={!transferTarget || transferOwnership.isPending}
            >
              {transferOwnership.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transfer Ownership
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Leave Group (non-owner) */}
      {!isOwner && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <LogOut className="h-5 w-5" />
              Leave Group
            </CardTitle>
            <CardDescription>Leave this group. You can rejoin later with an invitation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => leaveGroup.mutate({ groupId: activeGroupId })}
              disabled={leaveGroup.isPending}
            >
              {leaveGroup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Leave Group
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Group (owner only) */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Permanently delete this group and all its data. This action cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showDeleteConfirm ? (
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Group
              </Button>
            ) : (
              <div className="space-y-3 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                <p className="text-sm font-medium">
                  Type <span className="font-bold text-destructive">{group?.name}</span> to confirm deletion:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type group name to confirm"
                  className="border-destructive/30"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    disabled={deleteConfirmText !== group?.name || deleteGroupMut.isPending}
                    onClick={() => deleteGroupMut.mutate({ groupId: activeGroupId })}
                  >
                    {deleteGroupMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Permanently Delete
                  </Button>
                  <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
