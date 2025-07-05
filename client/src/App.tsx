import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Generate from "@/pages/generate";
import Gallery from "@/pages/gallery";
import Subscription from "@/pages/subscription";
import Admin from "@/pages/admin";
import Sharing from "@/pages/sharing";
import SharedImage from "@/pages/shared-image";
import Comparison from "@/pages/comparison";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/shared/:token" component={SharedImage} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/generate" component={Generate} />
          <Route path="/gallery" component={Gallery} />
          <Route path="/sharing" component={Sharing} />
          <Route path="/comparison/:imageId" component={Comparison} />
          <Route path="/subscription" component={Subscription} />
          <Route path="/admin" component={Admin} />
        </>
      )}
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
