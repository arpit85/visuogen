import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Generate from "@/pages/generate";
import VideoGenerator from "@/pages/video-generator";
import ImageEditor from "@/pages/image-editor";
import Gallery from "@/pages/gallery";
import Subscription from "@/pages/subscription";
import Admin from "@/pages/admin";
import Sharing from "@/pages/sharing";
import SharedImage from "@/pages/shared-image";
import Comparison from "@/pages/comparison";

import PurchaseCredits from "@/pages/purchase-credits";
import RedeemCoupon from "@/pages/redeem-coupon";
import ProfileSettings from "@/pages/profile-settings";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import NotificationsPage from "@/pages/notifications";
import Analytics from "@/pages/analytics";

import SubscriptionPayment from "@/pages/subscription-payment";
import SubscriptionSuccess from "@/pages/subscription-success";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/shared/:token" component={SharedImage} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {isLoading ? (
        <Route path="/" component={Landing} />
      ) : !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/generate" component={Generate} />
          <Route path="/video-generator" component={VideoGenerator} />
          <Route path="/editor" component={ImageEditor} />


          <Route path="/gallery" component={Gallery} />
          <Route path="/sharing" component={Sharing} />
          <Route path="/comparison/:imageId" component={Comparison} />
          <Route path="/purchase-credits" component={PurchaseCredits} />
          <Route path="/redeem-coupon" component={RedeemCoupon} />
          <Route path="/profile-settings" component={ProfileSettings} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/subscription" component={Subscription} />
          <Route path="/payment" component={SubscriptionPayment} />
          <Route path="/subscription-success" component={SubscriptionSuccess} />
          <Route path="/admin" component={Admin} />
          <Route path="/analytics" component={Analytics} />
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
