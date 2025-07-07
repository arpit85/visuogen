import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  description: string;
  price: string;
  creditsPerMonth: number;
  features: string[];
  isActive: boolean;
}

export default function AdminSimple() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Free Plan management states
  const [freePlanDescription, setFreePlanDescription] = useState("");
  const [freePlanCredits, setFreePlanCredits] = useState(0);
  const [freePlanFeatures, setFreePlanFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");

  console.log('Admin panel debug:', { isAuthenticated, isLoading });

  // Fetch free plan data
  const { data: freePlan, isLoading: freePlanLoading } = useQuery<Plan>({
    queryKey: ["/api/admin/free-plan"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Initialize free plan form data when data loads
  useEffect(() => {
    if (freePlan) {
      setFreePlanDescription(freePlan.description || "");
      setFreePlanCredits(freePlan.creditsPerMonth || 0);
      setFreePlanFeatures(Array.isArray(freePlan.features) ? freePlan.features : []);
    }
  }, [freePlan]);

  // Update free plan mutation
  const updateFreePlanMutation = useMutation({
    mutationFn: async (planData: { description: string; creditsPerMonth: number; features: string[] }) => {
      await apiRequest("PUT", "/api/admin/free-plan", planData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Free Plan updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/free-plan"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Free Plan",
        variant: "destructive",
      });
    },
  });

  const handleSaveFreePlan = () => {
    updateFreePlanMutation.mutate({
      description: freePlanDescription,
      creditsPerMonth: freePlanCredits,
      features: freePlanFeatures,
    });
  };

  const addFeature = () => {
    if (newFeature.trim() && !freePlanFeatures.includes(newFeature.trim())) {
      setFreePlanFeatures([...freePlanFeatures, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFreePlanFeatures(freePlanFeatures.filter((_, i) => i !== index));
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Loading Admin Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Checking authentication...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Access Required</CardTitle>
            <CardDescription>
              You need to be logged in to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Please log in with an administrator account to manage the platform
            </p>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="w-full"
            >
              Log In to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your AI image generator platform</p>
      </div>

      <Tabs defaultValue="free-plan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="free-plan">Free Plan</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Panel Status</CardTitle>
              <CardDescription>
                The admin panel is now loading successfully without JavaScript errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Authentication successful! You can now access admin features.</p>
              <Button 
                onClick={() => window.location.href = "/admin-full"}
                className="mt-4"
              >
                Go to Full Admin Panel
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="free-plan" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Free Plan Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Free Plan Configuration</CardTitle>
                <CardDescription>
                  Modify the Free Plan settings and features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {freePlanLoading ? (
                  <div className="flex justify-center">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={freePlanDescription}
                        onChange={(e) => setFreePlanDescription(e.target.value)}
                        placeholder="Enter Free Plan description"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="credits">Monthly Credits</Label>
                      <Input
                        id="credits"
                        type="number"
                        value={freePlanCredits}
                        onChange={(e) => setFreePlanCredits(parseInt(e.target.value) || 0)}
                        placeholder="Enter monthly credits"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Features</Label>
                      <div className="space-y-2">
                        {freePlanFeatures.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input value={feature} readOnly className="flex-1" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFeature(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add new feature"
                            value={newFeature}
                            onChange={(e) => setNewFeature(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                          />
                          <Button onClick={addFeature} variant="outline" size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleSaveFreePlan}
                      disabled={updateFreePlanMutation.isPending}
                      className="w-full"
                    >
                      {updateFreePlanMutation.isPending ? "Saving..." : "Save Free Plan"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Free Plan Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Free Plan Preview</CardTitle>
                <CardDescription>
                  Current Free Plan configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                {freePlan ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold">Plan: {freePlan.name}</h3>
                      <p className="text-sm text-muted-foreground">Price: {freePlan.price}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {freePlan.description || "No description set"}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Monthly Credits</h4>
                      <p className="text-sm text-muted-foreground">
                        {freePlan.creditsPerMonth} credits per month
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Features</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {freePlan.features && freePlan.features.length > 0 ? (
                          freePlan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                              {feature}
                            </li>
                          ))
                        ) : (
                          <li>No features configured</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading plan details...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}