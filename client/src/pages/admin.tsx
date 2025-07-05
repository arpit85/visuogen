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

  // Fetch API keys
  const { data: apiKeys = [], isLoading: apiKeysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/api-keys"],
    enabled: isAuthenticated,
    retry: false,
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

  // Mutation for toggling API key status
  const toggleApiKeyStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/api-keys/${id}/toggle`, "PATCH");
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
    const formData = new FormData(e.target as HTMLFormElement);
    const keyData = {
      id: selectedApiKey.id,
      provider: formData.get('provider') as string,
      name: formData.get('name') as string,
      keyValue: formData.get('keyValue') as string || undefined,
    };
    updateApiKeyMutation.mutate(keyData);
  };

  const toggleApiKeyVisibility = (keyId: number) => {
    setShowApiKeyValues(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
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

      <Tabs defaultValue="apikeys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
        </TabsList>

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
                <Select name="provider" defaultValue={selectedApiKey.provider} required>
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
    </div>
  );
}