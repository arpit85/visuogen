import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Check, Crown, Star } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  description: string;
  price: string;
  creditsPerMonth: number;
  features: string[];
  isActive: boolean;
}

export default function Subscription() {
  const { user } = useAuth();

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: credits } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Header title="Subscription" subtitle="Loading..." />
        </div>
      </div>
    );
  }

  const currentPlan = plans?.find(plan => plan.id === user?.planId);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header 
          title="Subscription" 
          subtitle="Manage your plan and billing" 
        />
        
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h3>
              <p className="text-gray-600">Select the perfect plan for your creative needs</p>
            </div>

            {/* Current Plan Banner */}
            {currentPlan && (
              <Card className="bg-gradient-to-r from-primary to-secondary text-white mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold mb-1">
                        Current Plan: {currentPlan.name}
                      </h4>
                      <p className="text-primary-100">
                        {credits?.credits || 0} credits remaining • Active
                      </p>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      Manage Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans?.map((plan, index) => {
                const isPopular = index === 1; // Middle plan is popular
                const isCurrent = plan.id === user?.planId;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative ${
                      isPopular 
                        ? 'border-2 border-primary shadow-lg' 
                        : 'border border-gray-200 shadow-sm'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-white px-4 py-1">
                          <Star className="w-3 h-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    <CardContent className="p-6">
                      <div className="text-center mb-6">
                        <h5 className="text-lg font-semibold text-gray-900 mb-2">
                          {plan.name}
                        </h5>
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          ${plan.price}
                        </div>
                        <p className="text-sm text-gray-600">per month</p>
                      </div>
                      
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-center text-sm text-gray-600">
                          <Check className="h-4 w-4 text-accent mr-3 flex-shrink-0" />
                          <span>{plan.creditsPerMonth} credits per month</span>
                        </li>
                        {Array.isArray(plan.features) ? plan.features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-center text-sm text-gray-600">
                            <Check className="h-4 w-4 text-accent mr-3 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        )) : (
                          // Handle case where features might be stored as JSON
                          typeof plan.features === 'object' && plan.features !== null &&
                          Object.values(plan.features).map((feature: any, idx: number) => (
                            <li key={idx} className="flex items-center text-sm text-gray-600">
                              <Check className="h-4 w-4 text-accent mr-3 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))
                        )}
                      </ul>
                      
                      {isCurrent ? (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          disabled
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          Current Plan
                        </Button>
                      ) : index === 0 ? (
                        <Button 
                          variant="outline" 
                          className="w-full"
                        >
                          Get Started
                        </Button>
                      ) : index === 1 ? (
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90"
                        >
                          Upgrade Now
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-secondary hover:bg-secondary/90"
                        >
                          Upgrade Now
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Features Comparison */}
            <Card className="mt-8 bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">What's Included</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">AI Models Available</h5>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-accent mr-2" />
                        DALL-E 3 (Starter, Pro, Enterprise)
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-accent mr-2" />
                        Midjourney v6 (Pro, Enterprise)
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-accent mr-2" />
                        Stable Diffusion XL (All plans)
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-accent mr-2" />
                        Beta Models (Enterprise only)
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Features & Support</h5>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-accent mr-2" />
                        Image gallery and management
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-accent mr-2" />
                        Basic editing tools
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-accent mr-2" />
                        High-resolution downloads
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-accent mr-2" />
                        Priority customer support
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
