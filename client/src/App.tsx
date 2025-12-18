import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
import ChatPage from "@/pages/app/chat";
import SettingsPage from "@/pages/app/settings";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />

      {/* Protected Routes */}
      <Route path="/app/chat" component={ChatPage} />
      <Route path="/app/chat/:id" component={ChatPage} />
      <Route path="/app/settings" component={SettingsPage} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
