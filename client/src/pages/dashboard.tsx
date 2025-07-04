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
  Wand2
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

  if (statsLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Header title="Dashboard" subtitle="Loading..." />
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header 
          title="Dashboard" 
          subtitle="Welcome back! Create amazing images with AI." 
        />
        
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
        </div>
      </div>
    </div>
  );
}
