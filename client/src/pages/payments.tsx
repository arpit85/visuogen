import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Gift, Loader2, Check, X, Star } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  popular: boolean;
}

interface CouponValidation {
  isValid: boolean;
  coupon?: any;
  discountAmount?: number;
  error?: string;
}

function CheckoutForm({ 
  amount, 
  credits, 
  couponCode, 
  onSuccess 
}: { 
  amount: number;
  credits: number;
  couponCode?: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments?success=true`,
        },
      });

      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        onSuccess();
        toast({
          title: "Payment successful!",
          description: `${credits} credits have been added to your account.`,
        });
      }
    } catch (error) {
      toast({
        title: "Payment error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total:</span>
          <span className="text-xl font-bold">${amount.toFixed(2)}</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {credits} credits
        </div>
      </div>

      <PaymentElement />

      <Button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

export default function PaymentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponValidation, setCouponValidation] = useState<CouponValidation | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [finalAmount, setFinalAmount] = useState(0);

  // Fetch credit packages
  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ["/api/payments/credit-packages"],
  });

  // Fetch payment history
  const { data: paymentHistory = [] } = useQuery({
    queryKey: ["/api/payments/history"],
  });

  // Validate coupon mutation
  const validateCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("/api/payments/validate-coupon", "POST", { couponCode: code });
      return response;
    },
    onSuccess: (validation) => {
      setCouponValidation(validation);
      if (validation.isValid) {
        toast({
          title: "Coupon applied!",
          description: `${validation.coupon.discountType === 'percentage' ? 
            `${validation.coupon.discountValue}% off` : 
            `$${validation.coupon.discountValue / 100} off`}`,
        });
      } else {
        toast({
          title: "Invalid coupon",
          description: validation.error,
          variant: "destructive",
        });
      }
    },
  });

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (params: { amount: number; couponCode?: string }) => {
      const response = await apiRequest("/api/payments/create-intent", "POST", {
        amount: params.amount,
        couponCode: params.couponCode,
        metadata: {
          credits: selectedPackage?.credits.toString(),
          package: selectedPackage?.id,
        },
      });
      return response;
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      toast({
        title: "Payment setup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate final amount with coupon discount
  useEffect(() => {
    if (selectedPackage) {
      let amount = selectedPackage.price;
      
      if (couponValidation?.isValid && couponValidation.coupon) {
        if (couponValidation.coupon.discountType === 'percentage') {
          amount = amount * (1 - couponValidation.coupon.discountValue / 100);
        } else if (couponValidation.coupon.discountType === 'fixed') {
          amount = Math.max(0, amount - couponValidation.coupon.discountValue / 100);
        }
      }
      
      setFinalAmount(amount);
    }
  }, [selectedPackage, couponValidation]);

  const handleValidateCoupon = () => {
    if (couponCode.trim()) {
      validateCouponMutation.mutate(couponCode.trim());
    }
  };

  const handlePurchase = () => {
    if (selectedPackage) {
      createPaymentIntentMutation.mutate({
        amount: finalAmount,
        couponCode: couponValidation?.isValid ? couponCode : undefined,
      });
    }
  };

  const handlePaymentSuccess = () => {
    setSelectedPackage(null);
    setCouponCode("");
    setCouponValidation(null);
    setClientSecret("");
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/payments/history"] });
  };

  const appearance = {
    theme: 'stripe' as const,
  };

  const options = {
    clientSecret,
    appearance,
  };

  if (packagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Purchase Credits</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Buy credits to generate more AI images with our platform
        </p>
      </div>

      {!clientSecret ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Credit Packages */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Choose a Package</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {packages.map((pkg: CreditPackage) => (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedPackage?.id === pkg.id
                      ? "ring-2 ring-blue-500 border-blue-500"
                      : "hover:shadow-md"
                  } ${pkg.popular ? "border-blue-200" : ""}`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <CardHeader className="relative">
                    {pkg.popular && (
                      <Badge className="absolute -top-2 -right-2 bg-blue-500">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                    <CardTitle className="flex items-center justify-between">
                      <span>{pkg.credits} Credits</span>
                      <span className="text-2xl font-bold">${pkg.price}</span>
                    </CardTitle>
                    <CardDescription>
                      ${(pkg.price / pkg.credits).toFixed(3)} per credit
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Perfect for {pkg.credits < 100 ? "casual" : pkg.credits < 300 ? "regular" : "heavy"} users
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Checkout Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gift className="w-5 h-5 mr-2" />
                  Coupon Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={validateCouponMutation.isPending}
                  />
                  <Button
                    onClick={handleValidateCoupon}
                    disabled={!couponCode.trim() || validateCouponMutation.isPending}
                    variant="outline"
                  >
                    {validateCouponMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>

                {couponValidation && (
                  <div className={`flex items-center space-x-2 text-sm ${
                    couponValidation.isValid ? "text-green-600" : "text-red-600"
                  }`}>
                    {couponValidation.isValid ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    <span>
                      {couponValidation.isValid
                        ? `Coupon applied: ${couponValidation.coupon.discountType === 'percentage' ? 
                            `${couponValidation.coupon.discountValue}% off` : 
                            `$${couponValidation.coupon.discountValue / 100} off`}`
                        : couponValidation.error}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedPackage && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>{selectedPackage.credits} Credits</span>
                    <span>${selectedPackage.price.toFixed(2)}</span>
                  </div>
                  
                  {couponValidation?.isValid && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${(selectedPackage.price - finalAmount).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <hr />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${finalAmount.toFixed(2)}</span>
                  </div>

                  <Button
                    onClick={handlePurchase}
                    disabled={createPaymentIntentMutation.isPending}
                    className="w-full"
                  >
                    {createPaymentIntentMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      "Proceed to Payment"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Complete Payment</CardTitle>
              <CardDescription>
                Secure payment powered by Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements options={options} stripe={stripePromise}>
                <CheckoutForm
                  amount={finalAmount}
                  credits={selectedPackage?.credits || 0}
                  couponCode={couponValidation?.isValid ? couponCode : undefined}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Payment History</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paymentHistory.map((payment: any) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          ${(payment.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {payment.creditsAwarded}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              payment.status === "succeeded"
                                ? "default"
                                : payment.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}