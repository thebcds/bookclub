import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useGroup } from "@/contexts/GroupContext";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BookOpen,
  Calendar,
  Globe,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  PanelLeft,
  Settings,
  Sun,
  Trophy,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import CreateGroupDialog from "./CreateGroupDialog";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import GroupSelector from "./GroupSelector";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", requiresGroup: true },
  { icon: Trophy, label: "Events", path: "/events", requiresGroup: true },
  { icon: BookOpen, label: "Books", path: "/books", requiresGroup: true },
  { icon: Calendar, label: "Calendar", path: "/calendar", requiresGroup: true },
  { icon: MessageCircle, label: "Chat", path: "/chat", requiresGroup: true },
  { icon: Users, label: "Members", path: "/members", requiresGroup: true },
  { icon: Settings, label: "Settings", path: "/settings", requiresGroup: true },
  { icon: Globe, label: "Discover", path: "/discover", requiresGroup: false },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    const handler = () => setCreateGroupOpen(true);
    window.addEventListener("open-create-group", handler);
    return () => window.removeEventListener("open-create-group", handler);
  }, []);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663326243662/JtwK2AToo98P6Ad64BKFob/boox-logo-transparent-dZxnjsPjNpHQaCKCVpKKLE.png" alt="boox" className="h-24" />
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Sign in to access boox. Manage events, vote on books, and join the discussion.
            </p>
          </div>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} size="lg" className="w-full shadow-lg hover:shadow-xl transition-all">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </SidebarProvider>
  );
}

const LOGO_DARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663326243662/JtwK2AToo98P6Ad64BKFob/boox-logo-transparent-dZxnjsPjNpHQaCKCVpKKLE.png";
const LOGO_LIGHT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663326243662/JtwK2AToo98P6Ad64BKFob/boox-logo-light-XozPqMGGRWnGLP7ieMSWuD.png";

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (w: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => location === item.path || (item.path !== "/" && location.startsWith(item.path)));
  const isMobile = useIsMobile();
  const { activeGroup } = useGroup();
  const { theme } = useTheme();
  const logoSrc = theme === "dark" || theme === "retro" ? LOGO_LIGHT : LOGO_DARK;

  useEffect(() => { if (isCollapsed) setIsResizing(false); }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="justify-center gap-0">
            <div className="flex items-center gap-3 px-2 py-3 transition-all w-full">
              <button onClick={toggleSidebar} className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none shrink-0" aria-label="Toggle navigation">
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <img src={logoSrc} alt="boox" className="h-20 shrink-0" />
                </div>
              )}
            </div>
            <div className="px-2 pb-2">
              <GroupSelector collapsed={isCollapsed} />
            </div>
            <Separator />
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                      disabled={item.requiresGroup && !activeGroup}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <ThemeToggle isCollapsed={isCollapsed} />
            <Separator className="my-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">{user?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">{user?.email || "-"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (isCollapsed) return; setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "retro", label: "Retro", icon: Monitor },
];

function ThemeToggle({ isCollapsed }: { isCollapsed: boolean }) {
  const { theme, cycleTheme, setTheme } = useTheme();
  const currentOption = themeOptions.find((o) => o.value === theme) ?? themeOptions[0];
  const CurrentIcon = currentOption.icon;

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={cycleTheme}
            className="flex items-center justify-center h-9 w-9 mx-auto rounded-lg hover:bg-accent transition-colors focus:outline-none"
            aria-label={`Current theme: ${currentOption.label}. Click to cycle.`}
          >
            <CurrentIcon className="h-4 w-4 text-primary" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{currentOption.label} mode</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
      {themeOptions.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex items-center gap-1.5 flex-1 justify-center rounded-md px-2 py-1.5 text-xs font-medium transition-all focus:outline-none ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
            aria-label={`${opt.label} mode`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
