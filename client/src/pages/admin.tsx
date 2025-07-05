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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Shield,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  Cloud
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
  provider: string;
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

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const [showApiKeyValues, setShowApiKeyValues] = useState<{[key: number]: boolean}>({});
  
  // Plan management states
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  
  // User management states
  const [showAssignCredits, setShowAssignCredits] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Edit form states
  const [editProvider, setEditProvider] = useState("");
  const [editKeyName, setEditKeyName] = useState("");
  const [editKeyValue, setEditKeyValue] = useState("");

  // Storage configuration states
  const [storageConfigs, setStorageConfigs] = useState({});
  const [activeStorageProvider, setActiveStorageProvider] = useState("local");
  const [wasabiConfig, setWasabiConfig] = useState({
    accessKeyId: "",
    secretAccessKey: "",
    bucketName: "",
    region: "us-east-1",
    endpoint: ""
  });
  const [backblazeConfig, setBackblazeConfig] = useState({
    applicationKeyId: "",
    applicationKey: "",
    bucketId: "",
    bucketName: "",
    endpoint: ""
  });

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

  // Fetch AI models
  const { data: aiModels = [], isLoading: modelsLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/admin/ai-models"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch plans
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/admin/plans"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch API keys
  const { data: apiKeys = [], isLoading: apiKeysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/api-keys"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch storage configurations
  const { data: storageData, isLoading: storageLoading } = useQuery({
    queryKey: ["/api/admin/storage/config"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Update storage config states when data is fetched
  useEffect(() => {
    if (storageData) {
      setStorageConfigs(storageData.configs || {});
      setActiveStorageProvider(storageData.activeProvider || "local");
      
      // Update form states with existing config
      if (storageData.configs?.wasabi) {
        setWasabiConfig(storageData.configs.wasabi);
      }
      if (storageData.configs?.backblaze) {
        setBackblazeConfig(storageData.configs.backblaze);
      }
    }
  }, [storageData]);

  // Plan management mutations
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      return await apiRequest("POST", "/api/admin/plans", planData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
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

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/admin/plans/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
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

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
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

  // Mutation for creating API keys
  const createApiKeyMutation = useMutation({
    mutationFn: async (keyData: any) => {
      return await apiRequest("POST", "/api/admin/api-keys", keyData);
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
      return await apiRequest("PATCH", `/api/admin/api-keys/${id}`, data);
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
      return await apiRequest("DELETE", `/api/admin/api-keys/${id}`);
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

  // Mutation for toggling API key status
  const toggleApiKeyStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/admin/api-keys/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({
        title: "Success",
        description: "API key status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update API key status",
        variant: "destructive",
      });
    },
  });

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
    
    const keyData = {
      id: selectedApiKey.id,
      provider: editProvider || selectedApiKey.provider,
      name: editKeyName || selectedApiKey.name,
      keyValue: editKeyValue || undefined,
    };
    
    // Only include non-empty values
    const updateData = Object.fromEntries(
      Object.entries(keyData).filter(([key, value]) => key === 'id' || (value !== undefined && value !== ''))
    );
    
    updateApiKeyMutation.mutate(updateData);
  };

  // Initialize edit form when opening dialog
  const openEditApiKeyDialog = (apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    setEditProvider(apiKey.provider);
    setEditKeyName(apiKey.name);
    setEditKeyValue("");
    setShowEditApiKey(true);
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const features = (formData.get('features') as string).split('\n').filter(f => f.trim());
    const planData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: formData.get('price') as string,
      creditsPerMonth: parseInt(formData.get('creditsPerMonth') as string),
      features,
      isActive: formData.get('isActive') === 'on',
    };
    createPlanMutation.mutate(planData);
  };

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const features = (formData.get('features') as string).split('\n').filter(f => f.trim());
    const planData = {
      id: selectedPlan.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: formData.get('price') as string,
      creditsPerMonth: parseInt(formData.get('creditsPerMonth') as string),
      features,
      isActive: formData.get('isActive') === 'on',
    };
    updatePlanMutation.mutate(planData);
  };

  const toggleApiKeyVisibility = (keyId: number) => {
    setShowApiKeyValues(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  // Storage configuration mutations
  const testStorageMutation = useMutation({
    mutationFn: async ({ provider, config }: { provider: string; config: any }) => {
      const response = await apiRequest("POST", "/api/admin/storage/test", { provider, config });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "Success" : "Test Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
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
        title: "Error",
        description: "Failed to test storage configuration",
        variant: "destructive",
      });
    },
  });

  const saveStorageMutation = useMutation({
    mutationFn: async ({ provider, config }: { provider: string; config: any }) => {
      const response = await apiRequest("POST", "/api/admin/storage/save", { provider, config });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage/config"] });
      toast({
        title: "Success",
        description: data.message,
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
        title: "Error",
        description: "Failed to save storage configuration",
        variant: "destructive",
      });
    },
  });

  const saveStorageMethodMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await apiRequest("POST", "/api/admin/storage/method", { provider });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: "Storage method updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage/config"] });
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
        description: "Failed to update storage method",
        variant: "destructive",
      });
    },
  });

  // Storage configuration handlers
  const handleTestAndSaveWasabi = async () => {
    console.log("Testing Wasabi with config:", wasabiConfig);
    
    // Check if required fields are filled
    if (!wasabiConfig.accessKeyId || !wasabiConfig.secretAccessKey || !wasabiConfig.bucketName || !wasabiConfig.region) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields: Access Key ID, Secret Access Key, Bucket Name, and Region",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // First test the configuration
      console.log("Starting test mutation...");
      const testResult = await testStorageMutation.mutateAsync({ 
        provider: 'wasabi', 
        config: wasabiConfig 
      });
      
      console.log("Test result:", testResult);
      
      if (testResult.success) {
        // If test passes, save the configuration
        console.log("Test passed, saving config...");
        await saveStorageMutation.mutateAsync({ 
          provider: 'wasabi', 
          config: wasabiConfig 
        });
      }
    } catch (error) {
      console.error("Test/Save error:", error);
      // Error handling is done in the mutation callbacks
    }
  };

  const handleTestAndSaveBackblaze = async () => {
    console.log("Testing Backblaze with config:", backblazeConfig);
    
    // Check if required fields are filled
    if (!backblazeConfig.applicationKeyId || !backblazeConfig.applicationKey || !backblazeConfig.bucketId || !backblazeConfig.bucketName) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields: Application Key ID, Application Key, Bucket ID, and Bucket Name",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // First test the configuration
      console.log("Starting Backblaze test mutation...");
      const testResult = await testStorageMutation.mutateAsync({ 
        provider: 'backblaze', 
        config: backblazeConfig 
      });
      
      console.log("Backblaze test result:", testResult);
      
      if (testResult.success) {
        // If test passes, save the configuration
        console.log("Test passed, saving Backblaze config...");
        await saveStorageMutation.mutateAsync({ 
          provider: 'backblaze', 
          config: backblazeConfig 
        });
      }
    } catch (error) {
      console.error("Backblaze Test/Save error:", error);
      // Error handling is done in the mutation callbacks
    }
  };

  const handleSaveStorageMethod = () => {
    saveStorageMethodMutation.mutate(activeStorageProvider);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your AI image generator platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images Generated</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.imagesGenerated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRevenue}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Pricing Plans</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          <TabsTrigger value="storage">Storage Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Provider Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Provider Status Overview
              </CardTitle>
              <CardDescription>
                Quick overview of AI provider configuration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['openai', 'piapi', 'stability', 'runware'].map((provider) => {
                  const providerKey = apiKeys.find((key: ApiKey) => key.provider === provider);
                  const isConfigured = providerKey && providerKey.isActive;
                  const providerNames: { [key: string]: string } = {
                    openai: 'OpenAI DALL-E',
                    piapi: 'Midjourney',
                    stability: 'Stable Diffusion',
                    runware: 'FLUX Models'
                  };
                  
                  return (
                    <Card key={provider} className={`text-center ${isConfigured ? 'border-green-500' : 'border-gray-300'}`}>
                      <CardContent className="pt-6">
                        <div className={`text-2xl mb-2 ${isConfigured ? 'text-green-500' : 'text-gray-400'}`}>
                          {isConfigured ? <CheckCircle className="h-8 w-8 mx-auto" /> : <XCircle className="h-8 w-8 mx-auto" />}
                        </div>
                        <h3 className="font-semibold">{providerNames[provider]}</h3>
                        <p className={`text-sm ${isConfigured ? 'text-green-600' : 'text-gray-500'}`}>
                          {isConfigured ? 'Configured' : 'Not Configured'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pricing Plans Management
                  </CardTitle>
                  <CardDescription>
                    Create, modify, and assign subscription plans to users
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreatePlan(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Credits/Month</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Active Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plansLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
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
                          <TableCell>
                            <div className="font-medium">{plan.price}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Coins className="h-4 w-4 text-yellow-500" />
                              {plan.creditsPerMonth}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {plan.features.slice(0, 2).map((feature, index) => (
                                <div key={index} className="text-sm text-muted-foreground">• {feature}</div>
                              ))}
                              {plan.features.length > 2 && (
                                <div className="text-sm text-muted-foreground">+{plan.features.length - 2} more</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">0 users</div>
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

        {/* API Keys Tab */}
        <TabsContent value="apikeys" className="space-y-6">
          {/* Provider Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Provider Status Overview
              </CardTitle>
              <CardDescription>
                Quick overview of AI provider configuration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['openai', 'piapi', 'stability', 'runware'].map((provider) => {
                  const providerKey = apiKeys.find((key: ApiKey) => key.provider === provider);
                  const isConfigured = providerKey && providerKey.isActive;
                  const providerNames: { [key: string]: string } = {
                    openai: 'OpenAI DALL-E',
                    piapi: 'Midjourney',
                    stability: 'Stable Diffusion',
                    runware: 'FLUX Models'
                  };
                  
                  return (
                    <Card key={provider} className={`text-center ${isConfigured ? 'border-green-500' : 'border-gray-300'}`}>
                      <CardContent className="pt-6">
                        <div className={`text-2xl mb-2 ${isConfigured ? 'text-green-500' : 'text-gray-400'}`}>
                          {isConfigured ? <CheckCircle className="h-8 w-8 mx-auto" /> : <XCircle className="h-8 w-8 mx-auto" />}
                        </div>
                        <h3 className="font-semibold">{providerNames[provider]}</h3>
                        <p className={`text-sm ${isConfigured ? 'text-green-600' : 'text-gray-500'}`}>
                          {isConfigured ? 'Configured' : 'Not Configured'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

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
                            <Badge 
                              variant="outline"
                              className={`capitalize ${
                                key.provider === 'openai' ? 'border-green-500 text-green-700' :
                                key.provider === 'piapi' ? 'border-purple-500 text-purple-700' :
                                key.provider === 'stability' ? 'border-blue-500 text-blue-700' :
                                key.provider === 'runware' ? 'border-orange-500 text-orange-700' :
                                'border-gray-500 text-gray-700'
                              }`}
                            >
                              {key.provider}
                            </Badge>
                          </TableCell>
                          <TableCell>{key.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {showApiKeyValues[key.id] ? key.keyValue : '•'.repeat(8) + '...'}
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
                                onClick={() => toggleApiKeyStatusMutation.mutate(key.id)}
                                title={key.isActive ? "Deactivate" : "Activate"}
                              >
                                {key.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditApiKeyDialog(key)}
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

        {/* AI Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Models
              </CardTitle>
              <CardDescription>
                View AI models and their configuration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Credit Cost</TableHead>
                      <TableHead>Max Resolution</TableHead>
                      <TableHead>Gen Time</TableHead>
                      <TableHead>Status</TableHead>
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
                      aiModels.map((model: AiModel) => {
                        const providerKey = apiKeys.find((key: ApiKey) => key.provider === model.provider);
                        const isProviderConfigured = providerKey && providerKey.isActive;
                        const isFullyActive = model.isActive && isProviderConfigured;
                        
                        return (
                          <TableRow key={model.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {model.name}
                                  {!isProviderConfigured && (
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">{model.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`capitalize ${
                                  model.provider === 'openai' ? 'border-green-500 text-green-700' :
                                  model.provider === 'piapi' ? 'border-purple-500 text-purple-700' :
                                  model.provider === 'stability' ? 'border-blue-500 text-blue-700' :
                                  model.provider === 'runware' ? 'border-orange-500 text-orange-700' :
                                  'border-gray-500 text-gray-700'
                                }`}
                              >
                                {model.provider}
                              </Badge>
                            </TableCell>
                            <TableCell>{model.creditCost}</TableCell>
                            <TableCell>{model.maxResolution}</TableCell>
                            <TableCell>{model.averageGenerationTime}s</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={isFullyActive ? "default" : "secondary"}>
                                  {isFullyActive ? "Ready" : model.isActive ? "Model Active" : "Inactive"}
                                </Badge>
                                {model.isActive && !isProviderConfigured && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-500">
                                    API Key Needed
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Settings Tab */}
        <TabsContent value="storage" className="space-y-6">
          {/* Storage Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Configuration
              </CardTitle>
              <CardDescription>
                Configure cloud storage providers for image uploads and storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Wasabi Configuration */}
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Cloud className="h-5 w-5" />
                      Wasabi Cloud Storage
                    </CardTitle>
                    <CardDescription>
                      Configure Wasabi S3-compatible storage for image hosting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="wasabi_access_key">Access Key ID</Label>
                      <Input 
                        id="wasabi_access_key" 
                        type="password" 
                        placeholder="Enter Wasabi Access Key"
                        className="font-mono text-sm"
                        value={wasabiConfig.accessKeyId}
                        onChange={(e) => setWasabiConfig(prev => ({ ...prev, accessKeyId: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wasabi_secret_key">Secret Access Key</Label>
                      <Input 
                        id="wasabi_secret_key" 
                        type="password" 
                        placeholder="Enter Wasabi Secret Key"
                        className="font-mono text-sm"
                        value={wasabiConfig.secretAccessKey}
                        onChange={(e) => setWasabiConfig(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wasabi_bucket">Bucket Name</Label>
                      <Input 
                        id="wasabi_bucket" 
                        placeholder="my-image-bucket"
                        className="font-mono text-sm"
                        value={wasabiConfig.bucketName}
                        onChange={(e) => setWasabiConfig(prev => ({ ...prev, bucketName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wasabi_region">Region</Label>
                      <Select 
                        value={wasabiConfig.region} 
                        onValueChange={(value) => setWasabiConfig(prev => ({ ...prev, region: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="us-east-1">US East 1 (N. Virginia)</SelectItem>
                          <SelectItem value="us-east-2">US East 2 (N. Virginia)</SelectItem>
                          <SelectItem value="us-west-1">US West 1 (Oregon)</SelectItem>
                          <SelectItem value="eu-central-1">EU Central 1 (Amsterdam)</SelectItem>
                          <SelectItem value="eu-west-1">EU West 1 (London)</SelectItem>
                          <SelectItem value="ap-northeast-1">AP Northeast 1 (Tokyo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wasabi_endpoint">Custom Endpoint (Optional)</Label>
                      <Input 
                        id="wasabi_endpoint" 
                        placeholder="s3.wasabisys.com"
                        className="font-mono text-sm"
                        value={wasabiConfig.endpoint}
                        onChange={(e) => setWasabiConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={storageConfigs.wasabi ? "text-green-600 border-green-500" : "text-blue-600 border-blue-500"}>
                          {storageConfigs.wasabi ? "Configured" : "Not Configured"}
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleTestAndSaveWasabi}
                        disabled={testStorageMutation.isPending || saveStorageMutation.isPending}
                      >
                        {testStorageMutation.isPending || saveStorageMutation.isPending ? "Testing..." : "Test & Save"}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Cost-effective:</strong> Typically 80% cheaper than AWS S3</p>
                      <p><strong>S3 Compatible:</strong> Drop-in replacement for AWS S3</p>
                      <p><strong>Global CDN:</strong> Fast delivery worldwide</p>
                    </div>
                  </CardContent>
                </Card>

                {/* BackBlaze Configuration */}
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <Shield className="h-5 w-5" />
                      Backblaze B2 Storage
                    </CardTitle>
                    <CardDescription>
                      Configure Backblaze B2 cloud storage for secure image hosting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="b2_application_key_id">Application Key ID</Label>
                      <Input 
                        id="b2_application_key_id" 
                        type="password" 
                        placeholder="Enter B2 Application Key ID"
                        className="font-mono text-sm"
                        value={backblazeConfig.applicationKeyId}
                        onChange={(e) => setBackblazeConfig(prev => ({ ...prev, applicationKeyId: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="b2_application_key">Application Key</Label>
                      <Input 
                        id="b2_application_key" 
                        type="password" 
                        placeholder="Enter B2 Application Key"
                        className="font-mono text-sm"
                        value={backblazeConfig.applicationKey}
                        onChange={(e) => setBackblazeConfig(prev => ({ ...prev, applicationKey: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="b2_bucket_id">Bucket ID</Label>
                      <Input 
                        id="b2_bucket_id" 
                        placeholder="Enter B2 Bucket ID"
                        className="font-mono text-sm"
                        value={backblazeConfig.bucketId}
                        onChange={(e) => setBackblazeConfig(prev => ({ ...prev, bucketId: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="b2_bucket_name">Bucket Name</Label>
                      <Input 
                        id="b2_bucket_name" 
                        placeholder="my-image-bucket-b2"
                        className="font-mono text-sm"
                        value={backblazeConfig.bucketName}
                        onChange={(e) => setBackblazeConfig(prev => ({ ...prev, bucketName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="b2_endpoint">Custom Endpoint (Optional)</Label>
                      <Input 
                        id="b2_endpoint" 
                        placeholder="s3.us-west-000.backblazeb2.com"
                        className="font-mono text-sm"
                        value={backblazeConfig.endpoint}
                        onChange={(e) => setBackblazeConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={storageConfigs.backblaze ? "text-green-600 border-green-500" : "text-orange-600 border-orange-500"}>
                          {storageConfigs.backblaze ? "Configured" : "Not Configured"}
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={handleTestAndSaveBackblaze}
                        disabled={testStorageMutation.isPending || saveStorageMutation.isPending}
                      >
                        {testStorageMutation.isPending || saveStorageMutation.isPending ? "Testing..." : "Test & Save"}
                      </Button>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                      <p className="font-medium text-blue-800 mb-2">Backblaze B2 Setup Instructions:</p>
                      <ul className="space-y-1 text-blue-700">
                        <li>• <strong>Application Key ID:</strong> Found in your B2 account under "App Keys"</li>
                        <li>• <strong>Application Key:</strong> The secret key shown only once when creating the key</li>
                        <li>• <strong>Bucket ID:</strong> Found in your bucket settings (starts with a long string)</li>
                        <li>• <strong>Bucket Name:</strong> Your bucket's name (user-friendly name)</li>
                      </ul>
                      <p className="text-blue-600 mt-2 text-xs">
                        <strong>Note:</strong> Application Keys must have read/write permissions for your bucket.
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Affordable:</strong> Pay only for what you use</p>
                      <p><strong>Reliable:</strong> 99.9% uptime SLA</p>
                      <p><strong>Secure:</strong> Built-in encryption and versioning</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Storage Method Selection */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Active Storage Method
                  </CardTitle>
                  <CardDescription>
                    Select which storage provider to use for new uploads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="storage_method">Primary Storage Provider</Label>
                      <Select 
                        value={activeStorageProvider} 
                        onValueChange={setActiveStorageProvider}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select storage method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local Storage (Development Only)</SelectItem>
                          <SelectItem value="wasabi" disabled={!storageConfigs.wasabi}>
                            Wasabi Cloud Storage {!storageConfigs.wasabi && "(Not Configured)"}
                          </SelectItem>
                          <SelectItem value="backblaze" disabled={!storageConfigs.backblaze}>
                            Backblaze B2 Storage {!storageConfigs.backblaze && "(Not Configured)"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800">Important Storage Notes:</p>
                          <ul className="mt-2 space-y-1 text-yellow-700">
                            <li>• Local storage is only suitable for development environments</li>
                            <li>• Configure at least one cloud provider for production use</li>
                            <li>• Images are automatically uploaded to the selected provider</li>
                            <li>• Changing providers does not migrate existing images</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={handleSaveStorageMethod}
                      disabled={saveStorageMethodMutation.isPending}
                    >
                      {saveStorageMethodMutation.isPending ? "Saving..." : "Save Storage Configuration"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  <SelectItem value="openai">OpenAI (DALL-E 3)</SelectItem>
                  <SelectItem value="piapi">PiAPI (Midjourney)</SelectItem>
                  <SelectItem value="stability">Stability AI (Stable Diffusion)</SelectItem>
                  <SelectItem value="runware">Runware AI (FLUX Models)</SelectItem>
                  <SelectItem value="wasabi">Wasabi (Storage)</SelectItem>
                  <SelectItem value="backblaze">Backblaze (Storage)</SelectItem>
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
              <div className="text-sm text-muted-foreground">
                <div className="space-y-1">
                  <p><strong>OpenAI:</strong> Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-500 hover:underline">platform.openai.com/api-keys</a></p>
                  <p><strong>PiAPI:</strong> Get your Midjourney API key from <a href="https://www.piapi.ai" target="_blank" className="text-blue-500 hover:underline">piapi.ai</a></p>
                  <p><strong>Stability AI:</strong> Get your API key from <a href="https://platform.stability.ai/account/keys" target="_blank" className="text-blue-500 hover:underline">platform.stability.ai</a></p>
                  <p><strong>Runware AI:</strong> Get your API key from <a href="https://runware.ai" target="_blank" className="text-blue-500 hover:underline">runware.ai</a></p>
                </div>
              </div>
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
                <Select value={editProvider} onValueChange={setEditProvider} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (DALL-E 3)</SelectItem>
                    <SelectItem value="piapi">PiAPI (Midjourney)</SelectItem>
                    <SelectItem value="stability">Stability AI (Stable Diffusion)</SelectItem>
                    <SelectItem value="runware">Runware AI (FLUX Models)</SelectItem>
                    <SelectItem value="wasabi">Wasabi (Storage)</SelectItem>
                    <SelectItem value="backblaze">Backblaze (Storage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Key Name</Label>
                <Input 
                  id="name" 
                  value={editKeyName} 
                  onChange={(e) => setEditKeyName(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyValue">API Key</Label>
                <Input 
                  id="keyValue" 
                  type="password" 
                  value={editKeyValue}
                  onChange={(e) => setEditKeyValue(e.target.value)}
                  placeholder="Enter new API key (leave blank to keep current)" 
                />
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

      {/* Create Plan Dialog */}
      <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Pricing Plan</DialogTitle>
            <DialogDescription>
              Create a new subscription plan with custom features and pricing
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input id="name" name="name" placeholder="e.g., Pro Plan" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" name="price" placeholder="e.g., $29.99/month" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="Brief description of the plan" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditsPerMonth">Credits Per Month</Label>
              <Input id="creditsPerMonth" name="creditsPerMonth" type="number" placeholder="100" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <textarea 
                id="features" 
                name="features" 
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Advanced AI models&#10;Priority support&#10;Commercial usage rights&#10;High-resolution exports"
                required 
              />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="isActive" name="isActive" className="rounded" defaultChecked />
              <Label htmlFor="isActive">Active (available for new subscriptions)</Label>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Pricing Plan</DialogTitle>
            <DialogDescription>
              Update the selected pricing plan details
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" name="name" defaultValue={selectedPlan.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" name="price" defaultValue={selectedPlan.price} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" defaultValue={selectedPlan.description} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditsPerMonth">Credits Per Month</Label>
                <Input id="creditsPerMonth" name="creditsPerMonth" type="number" defaultValue={selectedPlan.creditsPerMonth} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <textarea 
                  id="features" 
                  name="features" 
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  defaultValue={selectedPlan.features.join('\n')}
                  required 
                />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isActive" name="isActive" className="rounded" defaultChecked={selectedPlan.isActive} />
                <Label htmlFor="isActive">Active (available for new subscriptions)</Label>
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
    </div>
  );
}