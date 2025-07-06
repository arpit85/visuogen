import { useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, Zap, Star, Crown } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const creditPackages = [
  {
    id: 1,
    name: "Starter Pack",
    credits: 50,
    price: 9.99,
    popular: false,
    icon: Zap,
    description: "Perfect for trying out different AI models"
  },
  {
    id: 2,
    name: "Creator Pack",
    credits: 150,
    price: 24.99,
    popular: true,
    icon: Star,
    description: "Great for regular image generation"
  },
  {
    id: 3,
    name: "Pro Pack",
    credits: 350,
    price: 49.99,
    popular: false,
    icon: Crown,
    description: "Best value for heavy users"
  }
];

const CheckoutForm = ({ selectedPackage, onSuccess }: { selectedPackage: any, onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/purchase-credits?success=true',
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
          description: `${selectedPackage.credits} credits added to your account!`,
        });
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        size="lg"
      >
        {isProcessing ? "Processing..." : `Pay $${selectedPackage.price}`}
      </Button>
    </form>
  );
};

export default function PurchaseCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  const handleSelectPackage = async (pkg: any) => {
    setSelectedPackage(pkg);
    
    try {
      const response = await apiRequest("POST", "/api/purchase-credits", {
        amount: pkg.price,
        credits: pkg.credits
      });
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setShowPayment(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize payment",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setSelectedPackage(null);
    setClientSecret("");
    // Refresh user data or redirect
    window.location.reload();
  };

  if (showPayment && clientSecret) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-md">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setShowPayment(false)}
            className="mb-4"
          >
            ← Back to packages
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Complete Payment
              </CardTitle>
              <CardDescription>
                {selectedPackage.credits} credits for ${selectedPackage.price}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm 
                  selectedPackage={selectedPackage} 
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Purchase Credits</h1>
        <p className="text-muted-foreground">
          Buy credits to generate amazing AI images
        </p>
        {user && (user as any).credits !== undefined && (
          <div className="mt-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Current Balance: {(user as any).credits} credits
            </Badge>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {creditPackages.map((pkg) => {
          const Icon = pkg.icon;
          return (
            <Card 
              key={pkg.id} 
              className={`relative cursor-pointer transition-all hover:scale-105 ${
                pkg.popular ? 'border-primary shadow-lg' : ''
              }`}
              onClick={() => handleSelectPackage(pkg)}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 w-fit">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="text-center space-y-4">
                <div>
                  <div className="text-3xl font-bold">{pkg.credits}</div>
                  <div className="text-sm text-muted-foreground">credits</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold">${pkg.price}</div>
                  <div className="text-sm text-muted-foreground">
                    ${(pkg.price / pkg.credits).toFixed(3)} per credit
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  variant={pkg.popular ? "default" : "outline"}
                >
                  Select Package
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
          <CreditCard className="h-4 w-4" />
          Secure payments powered by Stripe
        </div>
      </div>
    </div>
  );
}