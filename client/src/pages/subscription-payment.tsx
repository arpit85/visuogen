import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowLeft } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const PaymentForm = ({ planData }: { planData: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/subscription-success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Your subscription has been upgraded!",
      });
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Complete Your Upgrade</h1>
          <p className="text-gray-600 dark:text-gray-400">Secure payment powered by Stripe</p>
        </div>

        {/* Plan Summary */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              {planData?.planName || 'Plan Upgrade'}
            </CardTitle>
            <CardDescription>
              You're upgrading to a premium plan with enhanced features
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-4xl font-bold text-primary">
              ${(planData?.amount / 100).toFixed(2)}
            </div>
            <Badge variant="secondary" className="text-sm">
              One-time payment
            </Badge>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>
              Enter your payment details to complete the upgrade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <PaymentElement />
              
              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setLocation('/subscription')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Plans
                </Button>
                <Button 
                  type="submit"
                  className="flex-1"
                  disabled={!stripe || isProcessing}
                >
                  {isProcessing ? 'Processing...' : `Pay $${(planData?.amount / 100).toFixed(2)}`}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>🔒 Your payment information is secure and encrypted</p>
        </div>
      </div>
    </div>
  );
};

export default function SubscriptionPayment() {
  const [clientSecret, setClientSecret] = useState("");
  const [planData, setPlanData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get client secret from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const secret = urlParams.get('client_secret');
    const planId = urlParams.get('plan_id');
    const planName = urlParams.get('plan_name');
    const amount = urlParams.get('amount');

    if (secret) {
      setClientSecret(secret);
      // Store plan data from URL parameters
      if (planId && planName && amount) {
        setPlanData({ 
          planId: parseInt(planId),
          planName: decodeURIComponent(planName),
          amount: parseInt(amount)
        });
      }
    } else {
      toast({
        title: "Invalid Payment Link",
        description: "Please start from the subscription page",
        variant: "destructive",
      });
    }
  }, [toast]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Setting up payment...</p>
        </div>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm planData={planData} />
    </Elements>
  );
}