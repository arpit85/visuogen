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
  Cloud,
  Zap,
  Filter
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

interface BadWord {
  id: number;
  word: string;
  severity: 'mild' | 'moderate' | 'severe';
  isActive: boolean;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface SmtpSettings {
  id: number;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  lastTestSuccess: boolean | null;
  lastTestMessage: string | null;
  lastTestAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Coupon {
  id: number;
  code: string;
  type: 'lifetime' | 'credits' | 'plan_upgrade';
  planId?: number;
  creditAmount?: number;
  description: string;
  isActive: boolean;
  maxUses?: number;
  currentUses: number;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CouponBatch {
  id: number;
  name: string;
  description: string;
  type: 'lifetime' | 'credits' | 'plan_upgrade';
  planId?: number;
  creditAmount?: number;
  quantity: number;
  prefix?: string;
  expiresAt?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  generatedCount: number;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
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
  
  // Bad words dialog states
  const [showCreateBadWord, setShowCreateBadWord] = useState(false);
  const [showEditBadWord, setShowEditBadWord] = useState(false);
  const [selectedBadWord, setSelectedBadWord] = useState<BadWord | null>(null);
  
  // Coupon dialog states
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [showEditCoupon, setShowEditCoupon] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  
  // Coupon batch dialog states
  const [showCreateCouponBatch, setShowCreateCouponBatch] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<CouponBatch | null>(null);
  
  // SMTP dialog states
  const [showCreateSmtp, setShowCreateSmtp] = useState(false);
  const [showEditSmtp, setShowEditSmtp] = useState(false);
  
  // Plan management states
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  
  // User management states
  const [showAssignCredits, setShowAssignCredits] = useState(false);
  const [showAssignPlan, setShowAssignPlan] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPlanForAssignment, setSelectedPlanForAssignment] = useState("");
  
  // AI model selection states
  const [selectedAiModels, setSelectedAiModels] = useState<number[]>([]);
  const [editingPlanAiModels, setEditingPlanAiModels] = useState<number[]>([]);
  
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
  const [bunnycdnConfig, setBunnycdnConfig] = useState({
    apiKey: "",
    storageZone: "",
    region: "ny",
    pullZoneUrl: ""
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

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
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

  // Fetch bad words
  const { data: badWords = [], isLoading: badWordsLoading } = useQuery<BadWord[]>({
    queryKey: ["/api/admin/bad-words"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch SMTP settings
  const { data: smtpSettings = null, isLoading: smtpLoading } = useQuery<SmtpSettings | null>({
    queryKey: ["/api/admin/smtp-settings"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch coupons
  const { data: coupons = [], isLoading: couponsLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch coupon batches
  const { data: couponBatches = [], isLoading: batchesLoading } = useQuery<CouponBatch[]>({
    queryKey: ["/api/admin/coupon-batches"],
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
      if (storageData.configs?.bunnycdn) {
        setBunnycdnConfig(storageData.configs.bunnycdn);
      }
    }
  }, [storageData]);

  // Load AI models for editing when a plan is selected
  useEffect(() => {
    if (selectedPlan && showEditPlan) {
      // Fetch existing AI models for this plan
      const fetchPlanAiModels = async () => {
        try {
          const response = await fetch(`/api/admin/plans/${selectedPlan.id}/ai-models`);
          if (response.ok) {
            const models = await response.json();
            setEditingPlanAiModels(models.map((m: any) => m.id));
          }
        } catch (error) {
          console.error('Failed to fetch plan AI models:', error);
        }
      };
      fetchPlanAiModels();
    }
  }, [selectedPlan, showEditPlan]);

  // Plan management mutations
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      // Create the plan first
      const plan = await apiRequest("POST", "/api/admin/plans", planData);
      
      // Then associate AI models if any are selected
      if (selectedAiModels.length > 0) {
        await apiRequest("PUT", `/api/admin/plans/${plan.id}/ai-models`, { 
          aiModelIds: selectedAiModels 
        });
      }
      
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      toast({
        title: "Success",
        description: "Plan created successfully",
      });
      setShowCreatePlan(false);
      setSelectedAiModels([]); // Reset selection
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
      // Update the plan first
      const plan = await apiRequest("PATCH", `/api/admin/plans/${id}`, data);
      
      // Then update AI model associations
      await apiRequest("PUT", `/api/admin/plans/${id}/ai-models`, { 
        aiModelIds: editingPlanAiModels 
      });
      
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      toast({
        title: "Success",
        description: "Plan updated successfully",
      });
      setShowEditPlan(false);
      setEditingPlanAiModels([]); // Reset selection
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update plan",
        variant: "destructive",
      });
    },
  });

  // Plan-AI Model association mutations
  const updatePlanAiModelsMutation = useMutation({
    mutationFn: async ({ planId, aiModelIds }: { planId: number; aiModelIds: number[] }) => {
      return await apiRequest("PUT", `/api/admin/plans/${planId}/ai-models`, { aiModelIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      toast({
        title: "Success",
        description: "Plan AI models updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update plan AI models",
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

  // Bad words mutations
  const createBadWordMutation = useMutation({
    mutationFn: async (wordData: any) => {
      return await apiRequest("POST", "/api/admin/bad-words", wordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bad-words"] });
      toast({
        title: "Success",
        description: "Bad word added successfully",
      });
      setShowCreateBadWord(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to add bad word",
        variant: "destructive",
      });
    },
  });

  const updateBadWordMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/admin/bad-words/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bad-words"] });
      toast({
        title: "Success",
        description: "Bad word updated successfully",
      });
      setShowEditBadWord(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update bad word",
        variant: "destructive",
      });
    },
  });

  const deleteBadWordMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/bad-words/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bad-words"] });
      toast({
        title: "Success",
        description: "Bad word deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete bad word",
        variant: "destructive",
      });
    },
  });

  const toggleBadWordStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/admin/bad-words/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bad-words"] });
      toast({
        title: "Success",
        description: "Bad word status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update bad word status",
        variant: "destructive",
      });
    },
  });

  // Credit management mutations
  const addCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: number; amount: number; description: string }) => {
      return await apiRequest("POST", "/api/admin/users/credits", { userId, amount, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Credits added successfully",
      });
      setShowAssignCredits(false);
      setSelectedUser(null);
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
        description: "Failed to add credits",
        variant: "destructive",
      });
    },
  });

  // Plan assignment mutation
  const assignPlanMutation = useMutation({
    mutationFn: async ({ userId, planId }: { userId: number; planId: number | null }) => {
      return await apiRequest("POST", "/api/admin/users/assign-plan", { userId, planId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Plan assigned successfully",
      });
      setShowAssignPlan(false);
      setSelectedUser(null);
      setSelectedPlanForAssignment("");
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
        description: "Failed to assign plan",
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
    const isLifetime = formData.get('isLifetime') === 'on';
    const planData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: formData.get('price') as string,
      creditsPerMonth: parseInt(formData.get('creditsPerMonth') as string),
      isLifetime,
      lifetimeCredits: null,
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
    const isLifetime = formData.get('isLifetime') === 'on';
    const planData = {
      id: selectedPlan.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: formData.get('price') as string,
      creditsPerMonth: parseInt(formData.get('creditsPerMonth') as string),
      isLifetime,
      lifetimeCredits: null,
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

  const handleAddCredits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const amount = parseInt(formData.get('amount') as string);
    const description = formData.get('description') as string;
    
    addCreditsMutation.mutate({
      userId: parseInt(selectedUser.id),
      amount,
      description
    });
  };

  const openAddCreditsDialog = (user: User) => {
    setSelectedUser(user);
    setShowAssignCredits(true);
  };

  const openAssignPlanDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedPlanForAssignment(user.planId?.toString() || "free");
    setShowAssignPlan(true);
  };

  const handleAssignPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    const planId = selectedPlanForAssignment === "free" || selectedPlanForAssignment === "" ? null : parseInt(selectedPlanForAssignment);
    
    assignPlanMutation.mutate({
      userId: parseInt(selectedUser.id),
      planId
    });
  };

  // Coupon mutations
  const createCouponMutation = useMutation({
    mutationFn: async (couponData: any) => {
      const response = await apiRequest("POST", "/api/admin/coupons", couponData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Coupon created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      setShowCreateCoupon(false);
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
        description: "Failed to create coupon",
        variant: "destructive",
      });
    },
  });

  const updateCouponMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest("PUT", `/api/admin/coupons/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Coupon updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      setShowEditCoupon(false);
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
        description: "Failed to update coupon",
        variant: "destructive",
      });
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/coupons/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Coupon deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
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
        description: "Failed to delete coupon",
        variant: "destructive",
      });
    },
  });

  const createCouponBatchMutation = useMutation({
    mutationFn: async (batchData: any) => {
      const response = await apiRequest("POST", "/api/admin/coupon-batches", batchData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Coupon batch created successfully. Coupons are being generated...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupon-batches"] });
      setShowCreateCouponBatch(false);
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
        description: "Failed to create coupon batch",
        variant: "destructive",
      });
    },
  });

  const deleteCouponBatchMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/coupon-batches/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Coupon batch deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupon-batches"] });
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
        description: "Failed to delete coupon batch",
        variant: "destructive",
      });
    },
  });

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

  // SMTP mutations
  const createSmtpMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/smtp-settings", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smtp-settings"] });
      setShowCreateSmtp(false);
      toast({
        title: "Success",
        description: "SMTP configuration created successfully",
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
        description: "Failed to create SMTP configuration",
        variant: "destructive",
      });
    },
  });

  const updateSmtpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/admin/smtp-settings/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smtp-settings"] });
      setShowEditSmtp(false);
      toast({
        title: "Success",
        description: "SMTP configuration updated successfully",
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
        description: "Failed to update SMTP configuration",
        variant: "destructive",
      });
    },
  });

  const testSmtpMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/admin/smtp-settings/${id}/test`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smtp-settings"] });
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
        description: "Failed to test SMTP configuration",
        variant: "destructive",
      });
    },
  });

  // SMTP handlers
  const handleTestSmtp = () => {
    if (smtpSettings) {
      testSmtpMutation.mutate(smtpSettings.id);
    }
  };

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

  const handleTestAndSaveBunnycdn = async () => {
    console.log("Testing Bunny CDN with config:", bunnycdnConfig);
    
    // Check if required fields are filled
    if (!bunnycdnConfig.apiKey || !bunnycdnConfig.storageZone || !bunnycdnConfig.pullZoneUrl) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields: API Key, Storage Zone, and Pull Zone URL",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // First test the configuration
      console.log("Starting Bunny CDN test mutation...");
      const testResult = await testStorageMutation.mutateAsync({ 
        provider: 'bunnycdn', 
        config: bunnycdnConfig 
      });
      
      console.log("Bunny CDN test result:", testResult);
      
      if (testResult.success) {
        // If test passes, save the configuration
        console.log("Test passed, saving Bunny CDN config...");
        await saveStorageMutation.mutateAsync({ 
          provider: 'bunnycdn', 
          config: bunnycdnConfig 
        });
      }
    } catch (error) {
      console.error("Bunny CDN Test/Save error:", error);
      // Error handling is done in the mutation callbacks
    }
  };

  const handleSaveStorageMethod = () => {
    saveStorageMethodMutation.mutate(activeStorageProvider);
  };

  // Coupon form handlers
  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const couponData = {
      code: formData.get('code') as string,
      type: formData.get('type') as string,
      planId: formData.get('planId') ? parseInt(formData.get('planId') as string) : null,
      creditAmount: formData.get('creditAmount') ? parseInt(formData.get('creditAmount') as string) : null,
      description: formData.get('description') as string,
      maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses') as string) : null,
      expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt') as string).toISOString() : null,
      isActive: formData.get('isActive') === 'on',
    };
    createCouponMutation.mutate(couponData);
  };

  const handleUpdateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoupon) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const couponData = {
      id: selectedCoupon.id,
      code: formData.get('code') as string,
      type: formData.get('type') as string,
      planId: formData.get('planId') ? parseInt(formData.get('planId') as string) : null,
      creditAmount: formData.get('creditAmount') ? parseInt(formData.get('creditAmount') as string) : null,
      description: formData.get('description') as string,
      maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses') as string) : null,
      expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt') as string).toISOString() : null,
      isActive: formData.get('isActive') === 'on',
    };
    updateCouponMutation.mutate(couponData);
  };

  const handleCreateCouponBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const batchData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as string,
      planId: formData.get('planId') ? parseInt(formData.get('planId') as string) : null,
      creditAmount: formData.get('creditAmount') ? parseInt(formData.get('creditAmount') as string) : null,
      quantity: parseInt(formData.get('quantity') as string),
      prefix: formData.get('prefix') as string || null,
      expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt') as string).toISOString() : null,
    };
    createCouponBatchMutation.mutate(batchData);
  };

  const openEditCouponDialog = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setShowEditCoupon(true);
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
          <TabsTrigger value="credits">Credit Management</TabsTrigger>
          <TabsTrigger value="plans">Pricing Plans</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          <TabsTrigger value="badwords">Content Filter</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="couponbatches">Coupon Batches</TabsTrigger>
          <TabsTrigger value="storage">Storage Settings</TabsTrigger>
          <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
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
                {['openai', 'piapi', 'stability', 'replicate'].map((provider) => {
                  const providerKey = apiKeys.find((key: ApiKey) => key.provider === provider);
                  const isConfigured = providerKey && providerKey.isActive;
                  const providerNames: { [key: string]: string } = {
                    openai: 'OpenAI DALL-E',
                    piapi: 'Midjourney',
                    stability: 'Stable Diffusion',
                    replicate: 'FLUX Models'
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

        {/* Credit Management Tab */}
        <TabsContent value="credits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Credit Management
              </CardTitle>
              <CardDescription>
                Manage user credits and view transaction history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Credits</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Join Date</TableHead>
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
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {user.credits || 0} credits
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.planId ? "default" : "outline"}>
                              {user.planId ? `Plan ${user.planId}` : "Free"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => openAddCreditsDialog(user)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Credits
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAssignPlanDialog(user)}
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Assign Plan
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
                      <TableHead>Type</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>AI Models</TableHead>
                      <TableHead>Active Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plansLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
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
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              plan.isLifetime 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {plan.isLifetime ? 'Lifetime' : 'Monthly'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Coins className="h-4 w-4 text-yellow-500" />
                              {plan.creditsPerMonth}/month
                              {plan.isLifetime && <span className="ml-2 text-xs text-purple-600 font-medium">(Lifetime)</span>}
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
                            <div className="text-sm text-muted-foreground">
                              Loading models...
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
                {['openai', 'piapi', 'stability', 'replicate'].map((provider) => {
                  const providerKey = apiKeys.find((key: ApiKey) => key.provider === provider);
                  const isConfigured = providerKey && providerKey.isActive;
                  const providerNames: { [key: string]: string } = {
                    openai: 'OpenAI DALL-E',
                    piapi: 'Midjourney',
                    stability: 'Stable Diffusion',
                    replicate: 'FLUX Models'
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
                                key.provider === 'replicate' ? 'border-orange-500 text-orange-700' :
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
                                  model.provider === 'replicate' ? 'border-orange-500 text-orange-700' :
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
                
                {/* Bunny CDN Configuration */}
                <Card className="border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                      <Zap className="h-5 w-5" />
                      Bunny CDN Storage
                    </CardTitle>
                    <CardDescription>
                      Configure Bunny CDN for fast global content delivery
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bunny_api_key">Storage Zone Password</Label>
                      <Input 
                        id="bunny_api_key" 
                        type="password" 
                        placeholder="Enter Storage Zone Password (not Account API Key)"
                        value={bunnycdnConfig.apiKey}
                        onChange={(e) => setBunnycdnConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bunny_storage_zone">Storage Zone</Label>
                      <Input 
                        id="bunny_storage_zone" 
                        placeholder="your-storage-zone-name"
                        value={bunnycdnConfig.storageZone}
                        onChange={(e) => setBunnycdnConfig(prev => ({ ...prev, storageZone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bunny_region">Region</Label>
                      <Select 
                        value={bunnycdnConfig.region} 
                        onValueChange={(value) => setBunnycdnConfig(prev => ({ ...prev, region: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ny">New York (ny)</SelectItem>
                          <SelectItem value="la">Los Angeles (la)</SelectItem>
                          <SelectItem value="sg">Singapore (sg)</SelectItem>
                          <SelectItem value="de">Frankfurt (de)</SelectItem>
                          <SelectItem value="uk">London (uk)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bunny_pull_zone_url">Pull Zone URL</Label>
                      <Input 
                        id="bunny_pull_zone_url" 
                        placeholder="https://your-pull-zone.b-cdn.net"
                        value={bunnycdnConfig.pullZoneUrl}
                        onChange={(e) => setBunnycdnConfig(prev => ({ ...prev, pullZoneUrl: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={storageConfigs.bunnycdn ? "text-green-600 border-green-500" : "text-orange-600 border-orange-500"}>
                          {storageConfigs.bunnycdn ? "Configured" : "Not Configured"}
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={handleTestAndSaveBunnycdn}
                        disabled={testStorageMutation.isPending || saveStorageMutation.isPending}
                      >
                        {testStorageMutation.isPending || saveStorageMutation.isPending ? "Testing..." : "Test & Save"}
                      </Button>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm">
                      <p className="font-medium text-purple-800 mb-2">Bunny CDN Setup Instructions:</p>
                      <ol className="space-y-1 text-purple-700 list-decimal list-inside">
                        <li>Create a Bunny CDN account at bunny.net</li>
                        <li>Create a Storage Zone in your preferred region</li>
                        <li>Go to Storage Zone → FTP & API Access</li>
                        <li>Copy the <strong>Password</strong> (NOT the Account API Key)</li>
                        <li>Create a Pull Zone linked to your Storage Zone</li>
                        <li>Use the Pull Zone URL for public image access</li>
                      </ol>
                      <p className="text-purple-600 mt-2">
                        <strong>Important:</strong> Use the Storage Zone Password from FTP & API Access, not your Account API Key.
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Fast:</strong> Global CDN with edge caching</p>
                      <p><strong>Affordable:</strong> Competitive bandwidth pricing</p>
                      <p><strong>Simple:</strong> Easy setup and management</p>
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
                          <SelectItem value="bunnycdn" disabled={!storageConfigs.bunnycdn}>
                            Bunny CDN Storage {!storageConfigs.bunnycdn && "(Not Configured)"}
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

        {/* Bad Words Content Filter Tab */}
        <TabsContent value="badwords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Content Filter Management
              </CardTitle>
              <CardDescription>
                Manage prohibited words that prevent inappropriate image generation across all AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Bad Words Filter</h3>
                    <p className="text-sm text-muted-foreground">
                      {badWords.length} words in filter • {badWords.filter(w => w.isActive).length} active
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateBadWord(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Word
                  </Button>
                </div>

                {badWordsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Word</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {badWords.map((word) => (
                          <TableRow key={word.id}>
                            <TableCell className="font-medium">
                              {word.word}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  word.severity === 'severe' ? 'destructive' :
                                  word.severity === 'moderate' ? 'secondary' : 
                                  'outline'
                                }
                              >
                                {word.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={word.isActive ? 'default' : 'secondary'}>
                                {word.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(word.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBadWord(word);
                                    setShowEditBadWord(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleBadWordStatusMutation.mutate(word.id)}
                                  disabled={toggleBadWordStatusMutation.isPending}
                                >
                                  {word.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteBadWordMutation.mutate(word.id)}
                                  disabled={deleteBadWordMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {badWords.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No bad words configured. Add words to start filtering inappropriate content.
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Content Filtering Information:</p>
                      <ul className="mt-2 space-y-1 text-blue-700">
                        <li>• Filters apply to all AI models and generation methods</li>
                        <li>• Words are matched case-insensitively as whole words</li>
                        <li>• Severe: Completely blocks generation with generic error</li>
                        <li>• Moderate: Blocks generation with specific word mentions</li>
                        <li>• Mild: Blocks generation with suggestion to rephrase</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Coupon Management
              </CardTitle>
              <CardDescription>
                Manage individual discount coupons for credits, plan upgrades, and lifetime subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Active Coupons</h3>
                    <p className="text-sm text-muted-foreground">
                      {coupons.length} coupons created • {coupons.filter(c => c.isActive).length} active
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateCoupon(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                  </Button>
                </div>

                {couponsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Benefit</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupons.map((coupon) => (
                          <TableRow key={coupon.id}>
                            <TableCell className="font-mono font-medium">
                              {coupon.code}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  coupon.type === 'lifetime' ? 'default' :
                                  coupon.type === 'credits' ? 'secondary' : 
                                  'outline'
                                }
                              >
                                {coupon.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {coupon.type === 'lifetime' ? 'Lifetime Access' :
                               coupon.type === 'credits' ? `${coupon.creditAmount} credits` :
                               coupon.planId ? `Plan upgrade` : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {coupon.currentUses}{coupon.maxUses ? `/${coupon.maxUses}` : ' (unlimited)'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={coupon.isActive ? 'default' : 'secondary'}>
                                {coupon.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditCouponDialog(coupon)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteCouponMutation.mutate(coupon.id)}
                                  disabled={deleteCouponMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {coupons.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No coupons created yet. Create your first coupon to get started.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coupon Batches Tab */}
        <TabsContent value="couponbatches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Bulk Coupon Generation
              </CardTitle>
              <CardDescription>
                Generate multiple coupons in batches for marketing campaigns and bulk distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Coupon Batches</h3>
                    <p className="text-sm text-muted-foreground">
                      {couponBatches.length} batches created
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateCouponBatch(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Batch
                  </Button>
                </div>

                {batchesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {couponBatches.map((batch) => (
                          <TableRow key={batch.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div>{batch.name}</div>
                                <div className="text-sm text-muted-foreground">{batch.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  batch.type === 'lifetime' ? 'default' :
                                  batch.type === 'credits' ? 'secondary' : 
                                  'outline'
                                }
                              >
                                {batch.type}
                              </Badge>
                            </TableCell>
                            <TableCell>{batch.quantity}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="text-sm">{batch.generatedCount}/{batch.quantity}</div>
                                <div className="w-16 h-2 bg-gray-200 rounded-full">
                                  <div 
                                    className="h-2 bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${(batch.generatedCount / batch.quantity) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  batch.status === 'completed' ? 'default' :
                                  batch.status === 'generating' ? 'secondary' :
                                  batch.status === 'failed' ? 'destructive' :
                                  'outline'
                                }
                              >
                                {batch.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(batch.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteCouponBatchMutation.mutate(batch.id)}
                                  disabled={deleteCouponBatchMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {couponBatches.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No coupon batches created yet. Create a batch to generate multiple coupons at once.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMTP Settings Tab */}
        <TabsContent value="smtp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>
                Configure SMTP settings for email notifications and system communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {smtpLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : smtpSettings ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Current SMTP Configuration</h3>
                        <Badge variant={smtpSettings.isActive ? "default" : "secondary"}>
                          {smtpSettings.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {smtpSettings.lastTestSuccess !== null && (
                          <Badge variant={smtpSettings.lastTestSuccess ? "default" : "destructive"}>
                            {smtpSettings.lastTestSuccess ? "Test Passed" : "Test Failed"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleTestSmtp}
                          disabled={testSmtpMutation.isPending}
                        >
                          {testSmtpMutation.isPending ? "Testing..." : "Test Configuration"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowEditSmtp(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">SMTP Host</Label>
                        <p className="text-sm text-muted-foreground">{smtpSettings.host}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Port</Label>
                        <p className="text-sm text-muted-foreground">{smtpSettings.port}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Security</Label>
                        <p className="text-sm text-muted-foreground">{smtpSettings.secure ? "SSL/TLS" : "None"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Username</Label>
                        <p className="text-sm text-muted-foreground">{smtpSettings.username}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">From Name</Label>
                        <p className="text-sm text-muted-foreground">{smtpSettings.fromName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">From Email</Label>
                        <p className="text-sm text-muted-foreground">{smtpSettings.fromEmail}</p>
                      </div>
                    </div>
                    
                    {smtpSettings.lastTestAt && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {smtpSettings.lastTestSuccess ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span className="font-medium">Last Test Result</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {smtpSettings.lastTestMessage}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tested on {new Date(smtpSettings.lastTestAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <div className="text-muted-foreground">
                      No SMTP configuration found. Set up SMTP to enable email notifications.
                    </div>
                    <Button onClick={() => setShowCreateSmtp(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Configure SMTP
                    </Button>
                  </div>
                )}
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
            <div className="flex items-center space-x-2 mb-4">
              <input 
                type="checkbox" 
                id="isLifetime" 
                name="isLifetime" 
                className="rounded" 
              />
              <Label htmlFor="isLifetime">Lifetime Plan (one-time purchase with monthly credits)</Label>
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
            <div className="space-y-2">
              <Label>Available AI Models</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4">
                {aiModels.map((model: AiModel) => (
                  <div key={model.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`model-${model.id}`}
                      checked={selectedAiModels.includes(model.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAiModels([...selectedAiModels, model.id]);
                        } else {
                          setSelectedAiModels(selectedAiModels.filter(id => id !== model.id));
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`model-${model.id}`} className="text-sm">
                      {model.name} ({model.creditCost} credits)
                    </label>
                  </div>
                ))}
              </div>
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
              <div className="flex items-center space-x-2 mb-4">
                <input 
                  type="checkbox" 
                  id="edit-isLifetime" 
                  name="isLifetime" 
                  className="rounded" 
                  defaultChecked={selectedPlan.isLifetime}
                />
                <Label htmlFor="edit-isLifetime">Lifetime Plan (one-time purchase with monthly credits)</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-creditsPerMonth">Credits Per Month</Label>
                <Input id="edit-creditsPerMonth" name="creditsPerMonth" type="number" defaultValue={selectedPlan.creditsPerMonth} required />
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
              <div className="space-y-2">
                <Label>Available AI Models</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4">
                  {aiModels.map((model: AiModel) => (
                    <div key={model.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-model-${model.id}`}
                        checked={editingPlanAiModels.includes(model.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingPlanAiModels([...editingPlanAiModels, model.id]);
                          } else {
                            setEditingPlanAiModels(editingPlanAiModels.filter(id => id !== model.id));
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`edit-model-${model.id}`} className="text-sm">
                        {model.name} ({model.creditCost} credits)
                      </label>
                    </div>
                  ))}
                </div>
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

      {/* Create Bad Word Dialog */}
      <Dialog open={showCreateBadWord} onOpenChange={setShowCreateBadWord}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bad Word</DialogTitle>
            <DialogDescription>
              Add a word to the content filter to prevent inappropriate image generation
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            createBadWordMutation.mutate({
              word: formData.get('word'),
              severity: formData.get('severity')
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="word">Word</Label>
              <Input 
                id="word" 
                name="word" 
                placeholder="Enter prohibited word" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity Level</Label>
              <Select name="severity" defaultValue="moderate">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild - Suggest rephrasing</SelectItem>
                  <SelectItem value="moderate">Moderate - Block with word mention</SelectItem>
                  <SelectItem value="severe">Severe - Block with generic message</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-medium">Filter Information:</p>
                  <p>Words are matched case-insensitively as whole words across all AI models.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createBadWordMutation.isPending}>
                {createBadWordMutation.isPending ? "Adding..." : "Add Word"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateBadWord(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Bad Word Dialog */}
      <Dialog open={showEditBadWord} onOpenChange={setShowEditBadWord}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bad Word</DialogTitle>
            <DialogDescription>
              Update the selected word in the content filter
            </DialogDescription>
          </DialogHeader>
          {selectedBadWord && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              updateBadWordMutation.mutate({
                id: selectedBadWord.id,
                word: formData.get('word'),
                severity: formData.get('severity')
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="word">Word</Label>
                <Input 
                  id="word" 
                  name="word" 
                  defaultValue={selectedBadWord.word}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity Level</Label>
                <Select name="severity" defaultValue={selectedBadWord.severity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild - Suggest rephrasing</SelectItem>
                    <SelectItem value="moderate">Moderate - Block with word mention</SelectItem>
                    <SelectItem value="severe">Severe - Block with generic message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateBadWordMutation.isPending}>
                  {updateBadWordMutation.isPending ? "Updating..." : "Update Word"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditBadWord(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Credits Dialog */}
      <Dialog open={showAssignCredits} onOpenChange={setShowAssignCredits}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits to User</DialogTitle>
            <DialogDescription>
              {selectedUser && `Add credits to ${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.email})`}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleAddCredits} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Credit Amount</Label>
                <Input 
                  id="amount" 
                  name="amount" 
                  type="number" 
                  min="1"
                  placeholder="100" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  name="description" 
                  placeholder="Admin credit bonus" 
                  required 
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={addCreditsMutation.isPending}>
                  {addCreditsMutation.isPending ? "Adding..." : "Add Credits"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAssignCredits(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Plan Dialog */}
      <Dialog open={showAssignPlan} onOpenChange={setShowAssignPlan}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Plan to User</DialogTitle>
            <DialogDescription>
              {selectedUser ? `Assign a plan to ${selectedUser.firstName || 'User'} ${selectedUser.lastName || ''} (${selectedUser.email})` : 'Select a plan to assign to the user'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedUser ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No user selected</p>
              </div>
            ) : (
              <form onSubmit={handleAssignPlan} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="planSelect">Select Plan</Label>
                  <Select value={selectedPlanForAssignment} onValueChange={setSelectedPlanForAssignment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free Plan (No subscription)</SelectItem>
                      {plans.length === 0 ? (
                        <SelectItem value="loading" disabled>Loading plans...</SelectItem>
                      ) : (
                        plans.map((plan: Plan) => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            {plan.name} - {plan.price} ({plan.creditsPerMonth} credits/month)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current Plan</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.planId ? 
                      plans.find(p => p.id === selectedUser.planId)?.name || 'Unknown Plan' : 
                      'Free Plan (No subscription)'
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={assignPlanMutation.isPending}>
                    {assignPlanMutation.isPending ? "Assigning..." : "Assign Plan"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAssignPlan(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Coupon Dialog */}
      <Dialog open={showCreateCoupon} onOpenChange={setShowCreateCoupon}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
            <DialogDescription>
              Create a new discount coupon for credits, plan upgrades, or lifetime subscriptions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code</Label>
              <Input 
                id="code" 
                name="code" 
                placeholder="e.g., SAVE50, LIFETIME2024" 
                required 
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Coupon Type</Label>
              <Select name="type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select coupon type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lifetime">Lifetime Subscription</SelectItem>
                  <SelectItem value="credits">Credit Package</SelectItem>
                  <SelectItem value="plan_upgrade">Plan Upgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditAmount">Credit Amount (for credit coupons)</Label>
              <Input 
                id="creditAmount" 
                name="creditAmount" 
                type="number" 
                placeholder="e.g., 100" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planId">Target Plan (for plan upgrade coupons)</Label>
              <Select name="planId">
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan: Plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input 
                id="description" 
                name="description" 
                placeholder="Describe what this coupon provides" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">Maximum Uses (optional)</Label>
              <Input 
                id="maxUses" 
                name="maxUses" 
                type="number" 
                placeholder="Leave empty for unlimited" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date (optional)</Label>
              <Input 
                id="expiresAt" 
                name="expiresAt" 
                type="datetime-local" 
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="isActive" 
                name="isActive" 
                defaultChecked 
                className="w-4 h-4" 
              />
              <Label htmlFor="isActive">Active (can be redeemed)</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createCouponMutation.isPending}>
                {createCouponMutation.isPending ? "Creating..." : "Create Coupon"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateCoupon(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Dialog */}
      <Dialog open={showEditCoupon} onOpenChange={setShowEditCoupon}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>
              Update the selected coupon's details
            </DialogDescription>
          </DialogHeader>
          {selectedCoupon && (
            <form onSubmit={handleUpdateCoupon} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code</Label>
                <Input 
                  id="code" 
                  name="code" 
                  defaultValue={selectedCoupon.code}
                  required 
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Coupon Type</Label>
                <Select name="type" defaultValue={selectedCoupon.type} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lifetime">Lifetime Subscription</SelectItem>
                    <SelectItem value="credits">Credit Package</SelectItem>
                    <SelectItem value="plan_upgrade">Plan Upgrade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditAmount">Credit Amount</Label>
                <Input 
                  id="creditAmount" 
                  name="creditAmount" 
                  type="number" 
                  defaultValue={selectedCoupon.creditAmount || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planId">Target Plan</Label>
                <Select name="planId" defaultValue={selectedCoupon.planId?.toString() || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No plan</SelectItem>
                    {plans.map((plan: Plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name} - {plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  name="description" 
                  defaultValue={selectedCoupon.description}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Maximum Uses</Label>
                <Input 
                  id="maxUses" 
                  name="maxUses" 
                  type="number" 
                  defaultValue={selectedCoupon.maxUses || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input 
                  id="expiresAt" 
                  name="expiresAt" 
                  type="datetime-local" 
                  defaultValue={selectedCoupon.expiresAt ? 
                    new Date(selectedCoupon.expiresAt).toISOString().slice(0, 16) : ""}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  name="isActive" 
                  defaultChecked={selectedCoupon.isActive}
                  className="w-4 h-4" 
                />
                <Label htmlFor="isActive">Active (can be redeemed)</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateCouponMutation.isPending}>
                  {updateCouponMutation.isPending ? "Updating..." : "Update Coupon"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditCoupon(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Coupon Batch Dialog */}
      <Dialog open={showCreateCouponBatch} onOpenChange={setShowCreateCouponBatch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Coupon Batch</DialogTitle>
            <DialogDescription>
              Generate multiple coupons at once for bulk distribution
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCouponBatch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Batch Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="e.g., Black Friday 2024, Summer Campaign" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input 
                id="description" 
                name="description" 
                placeholder="Describe this batch and its purpose" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Coupon Type</Label>
              <Select name="type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select coupon type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lifetime">Lifetime Subscription</SelectItem>
                  <SelectItem value="credits">Credit Package</SelectItem>
                  <SelectItem value="plan_upgrade">Plan Upgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Number of Coupons</Label>
              <Input 
                id="quantity" 
                name="quantity" 
                type="number" 
                min="1" 
                max="1000" 
                placeholder="e.g., 100" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefix">Code Prefix (optional)</Label>
              <Input 
                id="prefix" 
                name="prefix" 
                placeholder="e.g., BF2024, SUMMER" 
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditAmount">Credit Amount (for credit coupons)</Label>
              <Input 
                id="creditAmount" 
                name="creditAmount" 
                type="number" 
                placeholder="e.g., 50" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planId">Target Plan (for plan upgrade coupons)</Label>
              <Select name="planId">
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan: Plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date (optional)</Label>
              <Input 
                id="expiresAt" 
                name="expiresAt" 
                type="datetime-local" 
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Batch Generation Info:</p>
                  <ul className="mt-2 space-y-1 text-yellow-700">
                    <li>• Coupons will be generated with unique random codes</li>
                    <li>• Generation happens in the background and may take time for large batches</li>
                    <li>• Each coupon in the batch will have the same benefits and settings</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createCouponBatchMutation.isPending}>
                {createCouponBatchMutation.isPending ? "Creating..." : "Create Batch"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateCouponBatch(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create SMTP Dialog */}
      <Dialog open={showCreateSmtp} onOpenChange={setShowCreateSmtp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure SMTP Settings</DialogTitle>
            <DialogDescription>
              Set up email server configuration for system notifications
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = {
              host: formData.get('host'),
              port: parseInt(formData.get('port') as string),
              secure: formData.get('secure') === 'on',
              username: formData.get('username'),
              password: formData.get('password'),
              fromName: formData.get('fromName'),
              fromEmail: formData.get('fromEmail'),
              isActive: true,
            };
            createSmtpMutation.mutate(data);
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input 
                id="host" 
                name="host" 
                placeholder="smtp.gmail.com" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input 
                id="port" 
                name="port" 
                type="number" 
                placeholder="587" 
                required 
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="secure" 
                name="secure" 
                className="rounded border-gray-300"
              />
              <Label htmlFor="secure">Use SSL/TLS</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                name="username" 
                placeholder="your-email@gmail.com" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="your-app-password" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input 
                id="fromName" 
                name="fromName" 
                placeholder="Imagiify" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input 
                id="fromEmail" 
                name="fromEmail" 
                type="email" 
                placeholder="noreply@imagiify.com" 
                required 
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createSmtpMutation.isPending}>
                {createSmtpMutation.isPending ? "Creating..." : "Create Configuration"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateSmtp(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit SMTP Dialog */}
      <Dialog open={showEditSmtp} onOpenChange={setShowEditSmtp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit SMTP Settings</DialogTitle>
            <DialogDescription>
              Update email server configuration
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!smtpSettings) return;
            const formData = new FormData(e.currentTarget);
            const data = {
              host: formData.get('host'),
              port: parseInt(formData.get('port') as string),
              secure: formData.get('secure') === 'on',
              username: formData.get('username'),
              password: formData.get('password'),
              fromName: formData.get('fromName'),
              fromEmail: formData.get('fromEmail'),
            };
            updateSmtpMutation.mutate({ id: smtpSettings.id, data });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-host">SMTP Host</Label>
              <Input 
                id="edit-host" 
                name="host" 
                defaultValue={smtpSettings?.host || ''}
                placeholder="smtp.gmail.com" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-port">Port</Label>
              <Input 
                id="edit-port" 
                name="port" 
                type="number" 
                defaultValue={smtpSettings?.port || 587}
                placeholder="587" 
                required 
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="edit-secure" 
                name="secure" 
                defaultChecked={smtpSettings?.secure || false}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-secure">Use SSL/TLS</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input 
                id="edit-username" 
                name="username" 
                defaultValue={smtpSettings?.username || ''}
                placeholder="your-email@gmail.com" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Password</Label>
              <Input 
                id="edit-password" 
                name="password" 
                type="password" 
                placeholder="Leave blank to keep current password" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fromName">From Name</Label>
              <Input 
                id="edit-fromName" 
                name="fromName" 
                defaultValue={smtpSettings?.fromName || ''}
                placeholder="Imagiify" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fromEmail">From Email</Label>
              <Input 
                id="edit-fromEmail" 
                name="fromEmail" 
                type="email" 
                defaultValue={smtpSettings?.fromEmail || ''}
                placeholder="noreply@imagiify.com" 
                required 
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={updateSmtpMutation.isPending}>
                {updateSmtpMutation.isPending ? "Updating..." : "Update Configuration"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowEditSmtp(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}