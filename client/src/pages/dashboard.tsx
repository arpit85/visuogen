import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ResponsiveLayout from "@/components/layout/responsive-layout";
import ImageCard from "@/components/image-card";
import { useLocation } from "wouter";
import { 
  Image, 
  Coins, 
  Bot, 
  Crown,
  TrendingUp,
  Download,
  Edit,
  ArrowRight,
  Wand2,
  Settings,
  AlertTriangle,
  ShoppingCart,
  Zap,
  Sparkles,
  Palette,
  Brain,
  Clock,
  Star,
  Rocket
} from "lucide-react";

interface DashboardStats {
  totalGenerated: number;
  creditsSpent: number;
  favoriteModel: string;
  recentImages: any[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: credits } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits"],
  });

  const { data: availableModels = [] } = useQuery<any[]>({
    queryKey: ["/api/ai-models", { type: "image" }],
  });

  const { data: userPlan } = useQuery<any>({
    queryKey: ["/api/user/plan"],
  });

  if (statsLoading) {
    return (
      <ResponsiveLayout title="Dashboard" subtitle="Loading...">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  // Helper function to get provider icon and color
  const getProviderInfo = (provider: string) => {
    const providerMap = {
      'openai': { icon: Brain, color: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' },
      'piapi': { icon: Palette, color: 'bg-purple-500', textColor: 'text-purple-600', bgColor: 'bg-purple-50' },
      'stability': { icon: Zap, color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
      'replicate': { icon: Rocket, color: 'bg-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-50' },
    };
    return providerMap[provider as keyof typeof providerMap] || { icon: Bot, color: 'bg-gray-500', textColor: 'text-gray-600', bgColor: 'bg-gray-50' };
  };

  const getProviderDisplayName = (provider: string) => {
    const displayNames = {
      'openai': 'OpenAI',
      'piapi': 'Midjourney',
      'stability': 'Stability AI',
      'replicate': 'Replicate'
    };
    return displayNames[provider as keyof typeof displayNames] || provider;
  };

  return (
    <ResponsiveLayout title="Dashboard" subtitle={`Welcome back, ${(user as any)?.firstName || 'User'}`}>
      <div className="p-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Your AI Model
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Select from {availableModels.length} powerful AI models to bring your creative vision to life. Each model offers unique capabilities and artistic styles.
            </p>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Images Generated</p>
                  <p className="text-2xl font-bold text-blue-900">{stats?.totalGenerated || 0}</p>
                </div>
                <Image className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Credits Available</p>
                  <p className="text-2xl font-bold text-green-900">{credits?.credits || 0}</p>
                </div>
                <Coins className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Active Models</p>
                  <p className="text-2xl font-bold text-purple-900">{availableModels.length}</p>
                </div>
                <Bot className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Current Plan</p>
                  <p className="text-lg font-bold text-orange-900">{(userPlan as any)?.name || 'Free'}</p>
                </div>
                <Crown className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Models Showcase - Modern Stacked Design */}
        <div className="mb-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold gradient-text mb-6 float-animation">
              Explore Our AI Models
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Discover {availableModels.length} cutting-edge AI models, each with unique capabilities and artistic styles. 
              From photorealistic images to artistic masterpieces, find the perfect AI for your creative vision.
            </p>
          </div>

          {/* Provider Groups with Stacked Cards */}
          <div className="space-y-12">
            {Object.entries(
              availableModels.reduce((acc: any, model: any) => {
                if (!acc[model.provider]) acc[model.provider] = [];
                acc[model.provider].push(model);
                return acc;
              }, {})
            ).map(([provider, models]: [string, any]) => {
              const providerInfo = getProviderInfo(provider);
              const ProviderIcon = providerInfo.icon;
              
              return (
                <div key={provider} className="relative">
                  {/* Provider Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-2xl ${providerInfo.color} flex items-center justify-center shadow-lg`}>
                        <ProviderIcon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {getProviderDisplayName(provider)}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          {models.length} model{models.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${providerInfo.textColor} ${providerInfo.bgColor} px-4 py-2 text-sm font-medium`}>
                      {provider.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Stacked Model Cards */}
                  <div className="relative perspective-1000">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {models.map((model: any, index: number) => (
                        <div
                          key={model.id}
                          className="transform transition-all duration-500 hover:scale-105 hover:z-10 relative"
                          style={{
                            animationDelay: `${index * 0.1}s`,
                          }}
                        >
                          <Card className="group hover:shadow-2xl transition-all duration-500 bg-white dark:bg-gray-800 border-2 hover:border-primary/30 overflow-hidden relative">
                            {/* Gradient Background */}
                            <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${providerInfo.color.replace('bg-', 'from-')}/20 to-transparent`}></div>
                            
                            {/* Animated Orb */}
                            <div className={`absolute -top-4 -right-4 w-16 h-16 ${providerInfo.color} rounded-full opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500`}></div>
                            
                            <CardContent className="p-6 relative z-10">
                              {/* Model Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                      {model.name}
                                    </h4>
                                    {model.creditCost <= 1 && (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                        Budget
                                      </Badge>
                                    )}
                                    {model.creditCost >= 3 && (
                                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                                        Premium
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
                                    {model.description || "Advanced AI model for stunning image generation with unique artistic capabilities"}
                                  </p>
                                </div>
                              </div>

                              {/* Stats Grid */}
                              <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                                  <div className="flex items-center justify-center space-x-1 mb-1">
                                    <Coins className="h-4 w-4 text-amber-500" />
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">{model.creditCost}</span>
                                  </div>
                                  <p className="text-xs text-gray-500">credits</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                                  <div className="flex items-center justify-center space-x-1 mb-1">
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">{model.averageGenerationTime || 15}s</span>
                                  </div>
                                  <p className="text-xs text-gray-500">average</p>
                                </div>
                              </div>

                              {/* Features */}
                              <div className="flex items-center justify-center mb-6">
                                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                                  <Settings className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {model.maxResolution || "1024x1024"}
                                  </span>
                                </div>
                              </div>

                              {/* Action Button */}
                              <Button 
                                onClick={() => setLocation(`/generate?model=${model.id}`)}
                                className={`w-full bg-gradient-to-r ${providerInfo.color.replace('bg-', 'from-')} to-purple-600 hover:shadow-xl group-hover:shadow-2xl transition-all duration-300 relative overflow-hidden shimmer text-white border-0`}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                <Wand2 className="h-4 w-4 mr-2 relative z-10" />
                                <span className="relative z-10 font-semibold">Create with {model.name.split(' ')[0]}</span>
                              </Button>
                            </CardContent>

                            {/* Floating Elements */}
                            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-30 transition-all duration-500 float-animation">
                              <Sparkles className="h-8 w-8 text-primary group-hover:text-secondary" />
                            </div>
                            <div className="absolute bottom-4 left-4 opacity-5 group-hover:opacity-15 transition-all duration-300">
                              <div className={`w-3 h-3 ${providerInfo.color} rounded-full blur-sm`}></div>
                            </div>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Action */}
          <div className="text-center mt-16">
            <div className="relative inline-block">
              <Button 
                onClick={() => setLocation('/generate')}
                size="lg"
                className="bg-gradient-to-r from-primary via-purple-500 to-secondary hover:shadow-2xl hover:scale-110 transition-all duration-300 px-12 py-6 text-xl font-bold shimmer relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <Rocket className="h-6 w-6 mr-4 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10">Start Creating Amazing Images</span>
                <ArrowRight className="h-6 w-6 ml-4 relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
              </Button>
              
              {/* Floating decoration */}
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 blur-xl float-animation"></div>
              <div className="absolute -bottom-6 -left-6 w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-30 blur-lg float-animation" style={{ animationDelay: '1s' }}></div>
            </div>
            
            <p className="mt-6 text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
              Join thousands of creators using AI to bring their imagination to life
            </p>
          </div>
        </div>

          {/* Low Credits Warning */}
          {credits && (credits as any).credits <= 10 && (
            <div className="mb-6">
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-8 w-8 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-orange-900">
                          Low Credits Warning
                        </h3>
                        <p className="text-orange-700">
                          You have {(credits as any).credits} credits remaining. Buy more to continue generating images.
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setLocation('/purchase-credits')}
                      className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Buy Credits
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Images</h3>
                <div className="space-y-4">
                  {stats?.recentImages?.length ? (
                    stats.recentImages.slice(0, 3).map((image: any) => (
                      <div key={image.id} className="flex items-center space-x-4">
                        <img 
                          src={image.imageUrl} 
                          alt="Generated image" 
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {image.prompt.slice(0, 30)}...
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(image.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Download className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300">No images yet</p>
                      <p className="text-sm text-gray-500">Generate your first image to get started</p>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setLocation('/gallery')}
                >
                  View All Images
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-4">
                  <Button 
                    className="w-full justify-between bg-gradient-to-r from-primary to-secondary hover:shadow-lg"
                    onClick={() => setLocation('/generate')}
                  >
                    <div className="flex items-center space-x-3">
                      <Wand2 className="h-5 w-5" />
                      <span>Generate New Image</span>
                    </div>
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => setLocation('/gallery')}
                  >
                    <div className="flex items-center space-x-3">
                      <Image className="h-5 w-5" />
                      <span>Browse Gallery</span>
                    </div>
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => setLocation('/purchase-credits')}
                  >
                    <div className="flex items-center space-x-3">
                      <ShoppingCart className="h-5 w-5" />
                      <span>Buy More Credits</span>
                    </div>
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan and AI Models Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Current Plan */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                
                {userPlan ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Plan:</span>
                      <span className="text-sm font-semibold text-gray-900">{(userPlan as any).name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Monthly Credits:</span>
                      <span className="text-sm font-semibold text-primary">
                        {(userPlan as any).creditsPerMonth ? (userPlan as any).creditsPerMonth.toLocaleString() : 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Plan Price:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(userPlan as any).price ? parseFloat((userPlan as any).price).toFixed(2) : '0.00'}/month
                      </span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">{(userPlan as any).description}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setLocation('/subscription')}
                >
                  Manage Plan
                </Button>
              </CardContent>
            </Card>

            {/* Available AI Models */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Available AI Models</h3>
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {Array.isArray(availableModels) && availableModels.length > 0 ? (
                    availableModels.map((model: any) => (
                      <div key={model.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{model.name}</p>
                          <p className="text-xs text-gray-500">{model.provider}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                            {model.creditCost} credits
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setLocation('/generate')}
                >
                  Start Creating
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ResponsiveLayout>
  );
}
