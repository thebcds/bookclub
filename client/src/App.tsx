import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { GroupProvider } from "./contexts/GroupContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import BooksPage from "./pages/Books";
import CalendarPage from "./pages/Calendar";
import ChatPage from "./pages/Chat";
import Home from "./pages/Home";
import InviteAcceptPage from "./pages/InviteAccept";
import MembersPage from "./pages/Members";
import EventDetailPage from "./pages/EventDetail";
import EventsPage from "./pages/Events";
import NewEventPage from "./pages/NewEvent";

function DashboardRouter() {
  return (
    <GroupProvider>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/events" component={EventsPage} />
          <Route path="/events/new" component={NewEventPage} />
          <Route path="/events/:id" component={EventDetailPage} />
          <Route path="/books" component={BooksPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/chat" component={ChatPage} />
          <Route path="/members" component={MembersPage} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </GroupProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/invite/:token" component={InviteAcceptPage} />
      <Route component={DashboardRouter} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
