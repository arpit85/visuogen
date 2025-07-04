import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Users, 
  Crown, 
  Image, 
  DollarSign, 
  Edit, 
  Plus, 
  Trash2,
  Search
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  imagesGenerated: number;
  monthlyRevenue: number;
}

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
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
  }, [user, authLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/plans"],
    retry: false,
  });

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ["/api/admin/ai-models"],
    retry: false,
  });

  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, credits }: { userId: string; credits: number }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/credits`, { credits });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Credits Updated",
        description: "User credits have been updated successfully.",
      });
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
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || !user || !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header 
          title="Admin Panel" 
          subtitle="Manage users, plans, and system settings" 
        />
        
        <div className="p-6">
          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.totalUsers || 0}
                    </p>
                  </div>
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.activeSubscriptions || 0}
                    </p>
                  </div>
                  <Crown className="h-6 w-6 text-warning" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Images Generated</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.imagesGenerated || 0}
                    </p>
                  </div>
                  <Image className="h-6 w-6 text-secondary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${stats?.monthlyRevenue?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <DollarSign className="h-6 w-6 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Tabs */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <Tabs defaultValue="users" className="w-full">
              <div className="border-b border-gray-200 px-6 pt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="users">Users Management</TabsTrigger>
                  <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
                  <TabsTrigger value="models">AI Models</TabsTrigger>
                  <TabsTrigger value="settings">System Settings</TabsTrigger>
                </TabsList>
              </div>

              {/* Users Management Tab */}
              <TabsContent value="users" className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-900">Users Management</h4>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Plan</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Credits</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users?.filter((user: any) => 
                        !searchQuery || 
                        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((user: any) => (
                        <tr key={user.id}>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <img 
                                src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=6366f1&color=fff`} 
                                alt="User avatar" 
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.planId ? "default" : "secondary"}>
                              {user.planId ? 'Pro' : 'Free'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {user.credits}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const newCredits = prompt(`Enter new credit amount for ${user.firstName} ${user.lastName}:`, user.credits.toString());
                                  if (newCredits && !isNaN(Number(newCredits))) {
                                    updateCreditsMutation.mutate({
                                      userId: user.id,
                                      credits: Number(newCredits)
                                    });
                                  }
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-accent/10 text-accent">
                              Active
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Plans Management Tab */}
              <TabsContent value="plans" className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-900">Plans & Pricing</h4>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans?.map((plan: any) => (
                    <Card key={plan.id} className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-semibold text-gray-900">{plan.name}</h5>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Price:</span> ${plan.price}/month</p>
                          <p><span className="font-medium">Credits:</span> {plan.creditsPerMonth}/month</p>
                          <p><span className="font-medium">Active Users:</span> {users?.filter((u: any) => u.planId === plan.id).length || 0}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* AI Models Tab */}
              <TabsContent value="models" className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-900">AI Models Configuration</h4>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Model
                  </Button>
                </div>

                <div className="space-y-4">
                  {models?.map((model: any) => (
                    <Card key={model.id} className="bg-gray-50">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h5 className="font-semibold text-gray-900">{model.name}</h5>
                            <p className="text-sm text-gray-600">{model.description}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge className={model.isActive ? "bg-accent text-white" : "bg-gray-500 text-white"}>
                              {model.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Label className="font-medium">Credit Cost:</Label>
                            <Input 
                              type="number" 
                              defaultValue={model.creditCost} 
                              className="w-20"
                            />
                          </div>
                          <div>
                            <span className="font-medium">Max Resolution:</span> {model.maxResolution}
                          </div>
                          <div>
                            <span className="font-medium">Generation Time:</span> ~{model.averageGenerationTime}s
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* System Settings Tab */}
              <TabsContent value="settings" className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-6">System Settings</h4>
                
                <div className="space-y-6">
                  <Card className="bg-gray-50">
                    <CardContent className="p-6">
                      <h5 className="font-semibold text-gray-900 mb-4">General Settings</h5>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Maintenance Mode</p>
                            <p className="text-sm text-gray-600">Temporarily disable the application</p>
                          </div>
                          <Switch />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">New User Registration</p>
                            <p className="text-sm text-gray-600">Allow new users to sign up</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50">
                    <CardContent className="p-6">
                      <h5 className="font-semibold text-gray-900 mb-4">Credit System</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Default Free Credits
                          </Label>
                          <Input type="number" defaultValue={10} />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Credit Expiry (days)
                          </Label>
                          <Input type="number" defaultValue={365} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
