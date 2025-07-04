import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  CreditCard, 
  Settings, 
  TrendingUp, 
  Plus, 
  Edit,
  Trash2,
  DollarSign,
  Image,
  Calendar,
  CheckCircle,
  XCircle,
  Brain,
  Coins,
  Key,
  Database,
  Cloud,
  Shield,
  AlertCircle,
  Save,
  Eye,
  EyeOff
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  imagesGenerated: number;
  monthlyRevenue: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  credits: number;
  planId: number;
  isAdmin: boolean;
  createdAt: string;
}

interface Plan {
  id: number;
  name: string;
  description: string;
  price: string;
  creditsPerMonth: number;
  features: string[];
  isActive: boolean;
}

interface AiModel {
  id: number;
  name: string;
  description: string;
  creditCost: number;
  maxResolution: string;
  averageGenerationTime: number;
  isActive: boolean;
}

interface ApiKey {
  id: number;
  provider: string;
  name: string;
  keyValue: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [showEditModel, setShowEditModel] = useState(false);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const [showAssignCredits, setShowAssignCredits] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  
  // Form states
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedModel, setSelectedModel] = useState<AiModel | null>(null);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditDescription, setCreditDescription] = useState("");
  const [storageMethod, setStorageMethod] = useState("local");
  const [showApiKeyValues, setShowApiKeyValues] = useState<{[key: number]: boolean}>({});

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

  // Fetch admin stats
  const { data: stats = { totalUsers: 0, activeSubscriptions: 0, imagesGenerated: 0, monthlyRevenue: 0 }, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch plans
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch AI models
  const { data: aiModels = [], isLoading: modelsLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/admin/ai-models"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch API keys
  const { data: apiKeys = [], isLoading: apiKeysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/api-keys"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch system settings
  const { data: systemSettings = [], isLoading: settingsLoading } = useQuery<SystemSetting[]>({
    queryKey: ["/api/admin/settings"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Mutation for creating plans
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      return await apiRequest("/api/admin/plans", "POST", planData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({
        title: "Success",
        description: "Plan created successfully",
      });
      setShowCreatePlan(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create plan",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating plans
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest(`/api/admin/plans/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({
        title: "Success",
        description: "Plan updated successfully",
      });
      setShowEditPlan(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update plan",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting plans
  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/plans/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating AI models
  const createModelMutation = useMutation({
    mutationFn: async (modelData: any) => {
      return await apiRequest("/api/admin/ai-models", "POST", modelData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-models"] });
      toast({
        title: "Success",
        description: "AI model created successfully",
      });
      setShowCreateModel(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create AI model",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating AI models
  const updateModelMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest(`/api/admin/ai-models/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-models"] });
      toast({
        title: "Success",
        description: "AI model updated successfully",
      });
      setShowEditModel(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update AI model",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting AI models
  const deleteModelMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/ai-models/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-models"] });
      toast({
        title: "Success",
        description: "AI model deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete AI model",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating API keys
  const createApiKeyMutation = useMutation({
    mutationFn: async (keyData: any) => {
      return await apiRequest("/api/admin/api-keys", "POST", keyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({
        title: "Success",
        description: "API key created successfully",
      });
      setShowCreateApiKey(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating API keys
  const updateApiKeyMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest(`/api/admin/api-keys/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({
        title: "Success",
        description: "API key updated successfully",
      });
      setShowEditApiKey(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update API key",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting API keys
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/api-keys/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({
        title: "Success",
        description: "API key deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  // Mutation for assigning credits
  const assignCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: any) => {
      return await apiRequest(`/api/admin/users/${userId}/assign-credits`, "POST", {
        amount,
        description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Credits assigned successfully",
      });
      setShowAssignCredits(false);
      setCreditAmount(0);
      setCreditDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to assign credits",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating system settings
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: any) => {
      return await apiRequest("/api/admin/settings", "POST", {
        key,
        value,
        description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "System setting updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update system setting",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const planData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: formData.get('price') as string,
      creditsPerMonth: parseInt(formData.get('creditsPerMonth') as string),
      features: (formData.get('features') as string).split(',').map(f => f.trim()),
      isActive: formData.get('isActive') === 'on',
    };
    createPlanMutation.mutate(planData);
  };

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const planData = {
      id: selectedPlan.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: formData.get('price') as string,
      creditsPerMonth: parseInt(formData.get('creditsPerMonth') as string),
      features: (formData.get('features') as string).split(',').map(f => f.trim()),
      isActive: formData.get('isActive') === 'on',
    };
    updatePlanMutation.mutate(planData);
  };

  const handleCreateModel = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const modelData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      creditCost: parseInt(formData.get('creditCost') as string),
      maxResolution: formData.get('maxResolution') as string,
      averageGenerationTime: parseInt(formData.get('averageGenerationTime') as string),
      isActive: formData.get('isActive') === 'on',
    };
    createModelMutation.mutate(modelData);
  };

  const handleUpdateModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const modelData = {
      id: selectedModel.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      creditCost: parseInt(formData.get('creditCost') as string),
      maxResolution: formData.get('maxResolution') as string,
      averageGenerationTime: parseInt(formData.get('averageGenerationTime') as string),
      isActive: formData.get('isActive') === 'on',
    };
    updateModelMutation.mutate(modelData);
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const keyData = {
      provider: formData.get('provider') as string,
      name: formData.get('name') as string,
      keyValue: formData.get('keyValue') as string,
    };
    createApiKeyMutation.mutate(keyData);
  };

  const handleUpdateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApiKey) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const keyData = {
      id: selectedApiKey.id,
      provider: formData.get('provider') as string,
      name: formData.get('name') as string,
      keyValue: formData.get('keyValue') as string,
    };
    updateApiKeyMutation.mutate(keyData);
  };

  const handleAssignCredits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    assignCreditsMutation.mutate({
      userId: selectedUser.id,
      amount: creditAmount,
      description: creditDescription,
    });
  };

  const handleStorageMethodChange = (value: string) => {
    setStorageMethod(value);
    updateSettingMutation.mutate({
      key: "storage_method",
      value: value,
      description: "Primary storage method for generated images",
    });
  };

  const toggleApiKeyVisibility = (keyId: number) => {
    setShowApiKeyValues(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  if (isLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your AI Image Generator platform
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Active Subscriptions</p>
                <p className="text-2xl font-bold text-green-900">{stats.activeSubscriptions}</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Images Generated</p>
                <p className="text-2xl font-bold text-purple-900">{stats.imagesGenerated}</p>
              </div>
              <Image className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Monthly Revenue</p>
                <p className="text-2xl font-bold text-orange-900">${stats.monthlyRevenue}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage users, assign credits, and update plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="loading-spinner w-6 h-6 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{user.credits}</TableCell>
                          <TableCell>
                            <Badge variant={user.planId ? "default" : "secondary"}>
                              {user.planId ? plans.find(p => p.id === user.planId)?.name || "Unknown" : "Free"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? "destructive" : "secondary"}>
                              {user.isAdmin ? "Admin" : "User"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowAssignCredits(true);
                                }}
                              >
                                <Coins className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Subscription Plans
                  </CardTitle>
                  <CardDescription>
                    Create and manage subscription plans
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreatePlan(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plansLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="loading-spinner w-6 h-6 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      plans.map((plan: Plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{plan.name}</div>
                              <div className="text-sm text-muted-foreground">{plan.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>{plan.price}</TableCell>
                          <TableCell>{plan.creditsPerMonth}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {plan.features.slice(0, 2).join(", ")}
                              {plan.features.length > 2 && "..."}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={plan.isActive ? "default" : "secondary"}>
                              {plan.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPlan(plan);
                                  setShowEditPlan(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deletePlanMutation.mutate(plan.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Models
                  </CardTitle>
                  <CardDescription>
                    Manage AI models and their credit costs
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateModel(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Model
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Credit Cost</TableHead>
                      <TableHead>Max Resolution</TableHead>
                      <TableHead>Gen Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="loading-spinner w-6 h-6 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      aiModels.map((model: AiModel) => (
                        <TableRow key={model.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{model.name}</div>
                              <div className="text-sm text-muted-foreground">{model.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>{model.creditCost}</TableCell>
                          <TableCell>{model.maxResolution}</TableCell>
                          <TableCell>{model.averageGenerationTime}s</TableCell>
                          <TableCell>
                            <Badge variant={model.isActive ? "default" : "secondary"}>
                              {model.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedModel(model);
                                  setShowEditModel(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteModelMutation.mutate(model.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="apikeys" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Keys Management
                  </CardTitle>
                  <CardDescription>
                    Manage API keys for AI models and storage providers
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateApiKey(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeysLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="loading-spinner w-6 h-6 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      apiKeys.map((key: ApiKey) => (
                        <TableRow key={key.id}>
                          <TableCell>
                            <Badge variant="outline">{key.provider}</Badge>
                          </TableCell>
                          <TableCell>{key.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {showApiKeyValues[key.id] ? key.keyValue : key.keyValue}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleApiKeyVisibility(key.id)}
                              >
                                {showApiKeyValues[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={key.isActive ? "default" : "secondary"}>
                              {key.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(key.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedApiKey(key);
                                  setShowEditApiKey(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteApiKeyMutation.mutate(key.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Configuration
              </CardTitle>
              <CardDescription>
                Configure storage methods for generated images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`cursor-pointer transition-all ${storageMethod === 'local' ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4" onClick={() => handleStorageMethodChange('local')}>
                    <div className="flex items-center space-x-3">
                      <Database className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-medium">Local Storage</h3>
                        <p className="text-sm text-muted-foreground">Store images locally</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer transition-all ${storageMethod === 'wasabi' ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4" onClick={() => handleStorageMethodChange('wasabi')}>
                    <div className="flex items-center space-x-3">
                      <Cloud className="h-8 w-8 text-green-500" />
                      <div>
                        <h3 className="font-medium">Wasabi</h3>
                        <p className="text-sm text-muted-foreground">S3-compatible storage</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer transition-all ${storageMethod === 'backblaze' ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4" onClick={() => handleStorageMethodChange('backblaze')}>
                    <div className="flex items-center space-x-3">
                      <Shield className="h-8 w-8 text-purple-500" />
                      <div>
                        <h3 className="font-medium">Backblaze B2</h3>
                        <p className="text-sm text-muted-foreground">B2 cloud storage</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Current Storage Method</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Currently using: <span className="font-medium capitalize">{storageMethod}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Manage system-wide configuration settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="loading-spinner w-6 h-6"></div>
                  </div>
                ) : (
                  systemSettings.map((setting: SystemSetting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{setting.key}</div>
                        <div className="text-sm text-muted-foreground">{setting.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{setting.value}</code>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Plan Dialog */}
      <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
            <DialogDescription>
              Add a new subscription plan to your platform
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input id="name" name="name" placeholder="e.g., Professional" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Brief description of the plan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" placeholder="e.g., $19.99/month" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditsPerMonth">Credits per Month</Label>
              <Input id="creditsPerMonth" name="creditsPerMonth" type="number" placeholder="e.g., 100" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Features (comma-separated)</Label>
              <Textarea id="features" name="features" placeholder="e.g., HD Images, Priority Support, API Access" />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="isActive" name="isActive" className="rounded" />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createPlanMutation.isPending}>
                {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreatePlan(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={showEditPlan} onOpenChange={setShowEditPlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update the selected subscription plan
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input id="name" name="name" defaultValue={selectedPlan.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={selectedPlan.description} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" name="price" defaultValue={selectedPlan.price} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditsPerMonth">Credits per Month</Label>
                <Input id="creditsPerMonth" name="creditsPerMonth" type="number" defaultValue={selectedPlan.creditsPerMonth} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">Features (comma-separated)</Label>
                <Textarea id="features" name="features" defaultValue={selectedPlan.features.join(', ')} />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isActive" name="isActive" className="rounded" defaultChecked={selectedPlan.isActive} />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updatePlanMutation.isPending}>
                  {updatePlanMutation.isPending ? "Updating..." : "Update Plan"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditPlan(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create AI Model Dialog */}
      <Dialog open={showCreateModel} onOpenChange={setShowCreateModel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New AI Model</DialogTitle>
            <DialogDescription>
              Add a new AI model to your platform
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateModel} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Model Name</Label>
              <Input id="name" name="name" placeholder="e.g., DALL-E 3" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Brief description of the model" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditCost">Credit Cost</Label>
              <Input id="creditCost" name="creditCost" type="number" placeholder="e.g., 2" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxResolution">Max Resolution</Label>
              <Input id="maxResolution" name="maxResolution" placeholder="e.g., 1024x1024" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="averageGenerationTime">Average Generation Time (seconds)</Label>
              <Input id="averageGenerationTime" name="averageGenerationTime" type="number" placeholder="e.g., 30" />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="isActive" name="isActive" className="rounded" defaultChecked />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createModelMutation.isPending}>
                {createModelMutation.isPending ? "Creating..." : "Create Model"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateModel(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit AI Model Dialog */}
      <Dialog open={showEditModel} onOpenChange={setShowEditModel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit AI Model</DialogTitle>
            <DialogDescription>
              Update the selected AI model
            </DialogDescription>
          </DialogHeader>
          {selectedModel && (
            <form onSubmit={handleUpdateModel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Model Name</Label>
                <Input id="name" name="name" defaultValue={selectedModel.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={selectedModel.description} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditCost">Credit Cost</Label>
                <Input id="creditCost" name="creditCost" type="number" defaultValue={selectedModel.creditCost} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxResolution">Max Resolution</Label>
                <Input id="maxResolution" name="maxResolution" defaultValue={selectedModel.maxResolution} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="averageGenerationTime">Average Generation Time (seconds)</Label>
                <Input id="averageGenerationTime" name="averageGenerationTime" type="number" defaultValue={selectedModel.averageGenerationTime} />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isActive" name="isActive" className="rounded" defaultChecked={selectedModel.isActive} />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateModelMutation.isPending}>
                  {updateModelMutation.isPending ? "Updating..." : "Update Model"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditModel(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateApiKey} onOpenChange={setShowCreateApiKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Add a new API key for AI models or storage providers
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateApiKey} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select name="provider" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="midjourney">Midjourney</SelectItem>
                  <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                  <SelectItem value="wasabi">Wasabi</SelectItem>
                  <SelectItem value="backblaze">Backblaze</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Key Name</Label>
              <Input id="name" name="name" placeholder="e.g., Production OpenAI Key" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyValue">API Key</Label>
              <Input id="keyValue" name="keyValue" type="password" placeholder="Enter your API key" required />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createApiKeyMutation.isPending}>
                {createApiKeyMutation.isPending ? "Creating..." : "Create API Key"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateApiKey(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit API Key Dialog */}
      <Dialog open={showEditApiKey} onOpenChange={setShowEditApiKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update the selected API key
            </DialogDescription>
          </DialogHeader>
          {selectedApiKey && (
            <form onSubmit={handleUpdateApiKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select name="provider" defaultValue={selectedApiKey.provider} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="midjourney">Midjourney</SelectItem>
                    <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                    <SelectItem value="wasabi">Wasabi</SelectItem>
                    <SelectItem value="backblaze">Backblaze</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Key Name</Label>
                <Input id="name" name="name" defaultValue={selectedApiKey.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyValue">API Key</Label>
                <Input id="keyValue" name="keyValue" type="password" placeholder="Enter new API key (leave blank to keep current)" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateApiKeyMutation.isPending}>
                  {updateApiKeyMutation.isPending ? "Updating..." : "Update API Key"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditApiKey(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Credits Dialog */}
      <Dialog open={showAssignCredits} onOpenChange={setShowAssignCredits}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Credits</DialogTitle>
            <DialogDescription>
              Assign credits to {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignCredits} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Credit Amount</Label>
              <Input
                id="amount"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                placeholder="Enter credit amount (positive to add, negative to remove)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                placeholder="Reason for credit assignment"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={assignCreditsMutation.isPending}>
                {assignCreditsMutation.isPending ? "Assigning..." : "Assign Credits"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAssignCredits(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}