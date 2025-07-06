import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ShoppingCart
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

  const { data: availableModels = [] } = useQuery({
    queryKey: ["/api/ai-models"],
  });

  const { data: userPlan } = useQuery({
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

  return (
    <ResponsiveLayout title="Dashboard" subtitle={`Welcome back, ${user?.firstName || 'User'}`}>
      <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Images Generated</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats?.totalGenerated || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Image className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-accent mt-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Credits Used</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats?.creditsSpent || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <Coins className="h-6 w-6 text-secondary" />
                  </div>
                </div>
                <p className="text-sm text-accent mt-2">This month</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Favorite Model</p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats?.favoriteModel || 'None'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Bot className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Most used</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Plan Status</p>
                    <p className="text-xl font-bold text-gray-900">
                      {user?.planId ? 'Pro' : 'Free'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                    <Crown className="h-6 w-6 text-warning" />
                  </div>
                </div>
                <p className="text-sm text-accent mt-2">
                  {credits?.credits || 0} credits remaining
                </p>
              </CardContent>
            </Card>
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
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Images</h3>
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
                          <p className="text-sm font-medium text-gray-900 truncate">
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
                      <p className="text-gray-600">No images yet</p>
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

            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
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
                    onClick={() => setLocation('/subscription')}
                  >
                    <div className="flex items-center space-x-3">
                      <Coins className="h-5 w-5" />
                      <span>Buy More Credits</span>
                    </div>
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => setLocation('/subscription')}
                  >
                    <div className="flex items-center space-x-3">
                      <Crown className="h-5 w-5" />
                      <span>Account Settings</span>
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
                      <span className="text-sm font-semibold text-gray-900">{userPlan.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Monthly Credits:</span>
                      <span className="text-sm font-semibold text-primary">{userPlan.monthlyCredits || 'Unlimited'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Cost per Credit:</span>
                      <span className="text-sm font-semibold text-gray-900">${userPlan.creditCost}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">{userPlan.description}</p>
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
