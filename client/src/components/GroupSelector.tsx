import { useGroup } from "@/contexts/GroupContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Globe, Lock, Plus, Users } from "lucide-react";

export default function GroupSelector({ collapsed }: { collapsed?: boolean }) {
  const { groups, activeGroup, setActiveGroupId } = useGroup();

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
            <Users className="h-4 w-4 text-primary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {groups.map((g) => (
            <DropdownMenuItem
              key={g.id}
              onClick={() => setActiveGroupId(g.id)}
              className={g.id === activeGroup?.id ? "bg-accent" : ""}
            >
              <span className="truncate">{g.name}</span>
              {g.isPublic ? (
                <Globe className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
              ) : (
                <Lock className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between h-auto py-2 px-3 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate leading-tight">
                {activeGroup?.name ?? "Select Group"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                {activeGroup?.role === "admin" ? "Admin" : "Member"}
                {activeGroup && (
                  <>
                    <span className="mx-0.5">·</span>
                    {activeGroup.isPublic ? "Public" : "Private"}
                  </>
                )}
              </p>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {groups.map((g) => (
          <DropdownMenuItem
            key={g.id}
            onClick={() => setActiveGroupId(g.id)}
            className={g.id === activeGroup?.id ? "bg-accent" : ""}
          >
            <div className="flex items-center gap-2 w-full">
              <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-3 w-3 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{g.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {g.role === "admin" ? "Admin" : "Member"}
                </p>
              </div>
              {g.isPublic ? (
                <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
              ) : (
                <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {groups.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-create-group"));
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
