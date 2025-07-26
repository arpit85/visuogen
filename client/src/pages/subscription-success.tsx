import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown, Home, CreditCard } from "lucide-react";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');

    if (paymentIntent) {
      // Verify payment and complete subscription upgrade
      const completeUpgrade = async () => {
        try {
          const response = await apiRequest('POST', '/api/complete-subscription-upgrade', {
            paymentIntentId: paymentIntent
          });
          
          const result = await response.json();
          
          toast({
            title: "Subscription Upgraded!",
            description: `Welcome to your new ${result.planName} plan!`,
          });

          // Refresh user data
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
          queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });

          setIsProcessing(false);
        } catch (error) {
          console.error('Failed to complete upgrade:', error);
          toast({
            title: "Upgrade Processing",
            description: "Your payment was successful. Plan upgrade is being processed.",
            variant: "default",
          });
          setIsProcessing(false);
        }
      };

      completeUpgrade();
    } else {
      setIsProcessing(false);
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {isProcessing ? (
          <Card className="text-center">
            <CardContent className="p-12 space-y-6">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processing Your Upgrade</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we complete your subscription upgrade...
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Success Message */}
            <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl text-green-800 dark:text-green-300">
                  Payment Successful!
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-green-700 dark:text-green-400">
                  Your subscription has been upgraded successfully. You now have access to premium features!
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <Crown className="h-6 w-6 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Premium Access</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All AI models and features unlocked
                    </p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <CreditCard className="h-6 w-6 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Credits</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Credits added to your account
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    onClick={() => setLocation('/')}
                    className="w-full"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => setLocation('/generate')}
                    className="w-full"
                  >
                    Start Generating
                  </Button>
                </div>
                
                <div className="text-center">
                  <Button 
                    variant="ghost"
                    onClick={() => setLocation('/subscription')}
                    className="text-sm"
                  >
                    View Subscription Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}