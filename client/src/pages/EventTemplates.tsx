import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGroup } from "@/contexts/GroupContext";
import { trpc } from "@/lib/trpc";
import { Copy, FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function EventTemplates() {
  const { activeGroup, isGroupAdmin } = useGroup();
  const gid = activeGroup?.id;
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: templates, isLoading } = trpc.eventTemplates.list.useQuery(
    { groupId: gid! },
    { enabled: !!gid }
  );

  const deleteMut = trpc.eventTemplates.delete.useMutation({
    onSuccess: () => {
      utils.eventTemplates.list.invalidate();
      toast.success("Template deleted");
    },
  });

  const schemeLabel = (s: string) => {
    if (s === "tournament") return "Tournament Bracket";
    if (s === "simple_majority") return "Simple Majority";
    if (s === "ranked_choice") return "Ranked Choice";
    if (s === "no_vote") return "No Vote";
    return s;
  };

  const schemeBadgeColor = (s: string) => {
    if (s === "tournament") return "bg-purple-100 text-purple-800";
    if (s === "simple_majority") return "bg-blue-100 text-blue-800";
    if (s === "ranked_choice") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-800";
  };

  if (!activeGroup) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Event Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Save and reuse event configurations for recurring picks.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              groupId={gid!}
              isAdmin={isGroupAdmin}
              schemeLabel={schemeLabel}
              schemeBadgeColor={schemeBadgeColor}
              onDelete={() => deleteMut.mutate({ groupId: gid!, templateId: tpl.id })}
              onCreated={(eventId) => setLocation(`/events/${eventId}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No templates yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Save a template from any event&apos;s settings menu, or templates will appear here when created.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  groupId,
  isAdmin,
  schemeLabel,
  schemeBadgeColor,
  onDelete,
  onCreated,
}: {
  template: { id: number; name: string; votingScheme: string; maxTotalSubmissions: number; maxSubmissionsPerMember: number; anonymousVoting: boolean; hideTalliesUntilComplete: boolean; adminCurated: boolean; maxPageCount: number | null; createdAt: Date };
  groupId: number;
  isAdmin: boolean;
  schemeLabel: (s: string) => string;
  schemeBadgeColor: (s: string) => string;
  onDelete: () => void;
  onCreated: (eventId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createFromTemplate = trpc.eventTemplates.createEvent.useMutation({
    onSuccess: (data) => {
      toast.success("Event created from template");
      setOpen(false);
      onCreated(data.id);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">{template.name}</CardTitle>
          <Badge variant="secondary" className={schemeBadgeColor(template.votingScheme)}>
            {schemeLabel(template.votingScheme)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>Max submissions: <span className="text-foreground font-medium">{template.maxTotalSubmissions}</span></div>
          <div>Per member: <span className="text-foreground font-medium">{template.maxSubmissionsPerMember}</span></div>
          {template.maxPageCount && <div>Max pages: <span className="text-foreground font-medium">{template.maxPageCount}</span></div>}
          {template.anonymousVoting && <div><Badge variant="outline" className="text-xs">Anonymous voting</Badge></div>}
          {template.hideTalliesUntilComplete && <div><Badge variant="outline" className="text-xs">Hidden tallies</Badge></div>}
          {template.adminCurated && <div><Badge variant="outline" className="text-xs">Admin curated</Badge></div>}
        </div>

        <p className="text-xs text-muted-foreground">
          Created {new Date(template.createdAt).toLocaleDateString()}
        </p>

        {isAdmin && (
          <div className="flex gap-2 pt-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default" className="flex-1">
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Use Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Event from Template</DialogTitle>
                  <DialogDescription>
                    Create a new event using the &quot;{template.name}&quot; template settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Event Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., April 2026 Pick" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={() => createFromTemplate.mutate({ groupId, templateId: template.id, title, description: description || undefined })} disabled={!title.trim() || createFromTemplate.isPending}>
                    {createFromTemplate.isPending ? "Creating..." : "Create Event"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
