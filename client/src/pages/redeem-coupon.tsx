import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gift, Zap, CreditCard, Crown, AlertCircle, CheckCircle } from "lucide-react";
import { useEffect } from "react";

interface CouponRedemptionResult {
  success: boolean;
  coupon?: {
    id: number;
    code: string;
    type: 'lifetime' | 'credits' | 'plan_upgrade';
    planId?: number;
    creditAmount?: number;
    description: string;
  };
  message: string;
}

export default function RedeemCoupon() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState("");
  const [redemptionResult, setRedemptionResult] = useState<CouponRedemptionResult | null>(null);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const redeemCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/coupons/redeem", { code });
      return await response.json();
    },
    onSuccess: (data: CouponRedemptionResult) => {
      setRedemptionResult(data);
      if (data.success) {
        toast({
          title: "Coupon Redeemed Successfully!",
          description: data.message,
        });
        // Invalidate user data to refresh credits/plan info
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        setCouponCode("");
      } else {
        toast({
          title: "Redemption Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to redeem coupon. Please try again.",
        variant: "destructive",
      });
      setRedemptionResult({
        success: false,
        message: "Failed to redeem coupon. Please try again."
      });
    },
  });

  const handleRedeemCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }
    redeemCouponMutation.mutate(couponCode.trim().toUpperCase());
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <Gift className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Redeem Coupon</h1>
          <p className="text-muted-foreground">
            Enter your coupon code to unlock credits, plan upgrades, or lifetime access
          </p>
        </div>

        {/* Redemption Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Enter Coupon Code
            </CardTitle>
            <CardDescription>
              Enter your coupon code exactly as provided (case insensitive)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRedeemCoupon} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="couponCode">Coupon Code</Label>
                <Input
                  id="couponCode"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter your coupon code (e.g., SAVE50, LIFETIME2024)"
                  className="font-mono text-center text-lg"
                  maxLength={50}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                disabled={redeemCouponMutation.isPending || !couponCode.trim()}
              >
                {redeemCouponMutation.isPending ? "Redeeming..." : "Redeem Coupon"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Redemption Result */}
        {redemptionResult && (
          <Card className={`mb-6 ${redemptionResult.success ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${redemptionResult.success ? 'bg-green-500' : 'bg-red-500'}`}>
                  {redemptionResult.success ? (
                    <CheckCircle className="h-5 w-5 text-white" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${redemptionResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {redemptionResult.success ? 'Coupon Redeemed Successfully!' : 'Redemption Failed'}
                  </h3>
                  <p className={`mt-1 ${redemptionResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {redemptionResult.message}
                  </p>
                  
                  {redemptionResult.success && redemptionResult.coupon && (
                    <div className="mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <h4 className="font-medium mb-2">Coupon Details:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">{redemptionResult.coupon.code}</Badge>
                          <Badge 
                            variant={
                              redemptionResult.coupon.type === 'lifetime' ? 'default' :
                              redemptionResult.coupon.type === 'credits' ? 'secondary' : 
                              'outline'
                            }
                          >
                            {redemptionResult.coupon.type === 'lifetime' ? 'Lifetime Access' :
                             redemptionResult.coupon.type === 'credits' ? 'Credit Package' :
                             'Plan Upgrade'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {redemptionResult.coupon.description}
                        </p>
                        {redemptionResult.coupon.type === 'credits' && redemptionResult.coupon.creditAmount && (
                          <div className="flex items-center gap-2 text-sm">
                            <CreditCard className="h-4 w-4" />
                            <span>{redemptionResult.coupon.creditAmount} credits added to your account</span>
                          </div>
                        )}
                        {redemptionResult.coupon.type === 'lifetime' && (
                          <div className="flex items-center gap-2 text-sm">
                            <Crown className="h-4 w-4" />
                            <span>You now have lifetime access to VisuoGen!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Coupon Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p>Coupon codes are case insensitive and will be automatically converted to uppercase</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p>Each coupon can only be redeemed once per account</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p>Credits and benefits are immediately added to your account upon successful redemption</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p>Some coupons may have expiry dates or usage limits</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p>Lifetime coupons grant permanent access to all AI models and features</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}