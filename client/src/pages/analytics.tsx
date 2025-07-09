import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics, ANALYTICS_EVENTS } from "@/hooks/useAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Image, 
  DollarSign, 
  Activity,
  Eye,
  Clock,
  Zap,
  Calendar,
  BarChart3,
  User,
  MousePointer
} from "lucide-react";

interface AnalyticsOverview {
  totalUsers: number;
  totalImages: number;
  totalRevenue: number;
  userGrowth: number;
  imageGrowth: number;
  revenueGrowth: number;
}

interface DailyStats {
  date: string;
  newUsers: number;
  imagesGenerated: number;
  revenue: string;
  activeUsers: number;
}

interface ChartDataPoint {
  date: string;
  users: number;
  images: number;
  revenue: number;
  activeUsers: number;
}

interface DashboardData {
  overview: AnalyticsOverview;
  dailyStats: DailyStats[];
  chartData: ChartDataPoint[];
}

interface RealtimeData {
  today: DailyStats;
  recentActivity: Array<{
    id: number;
    eventType: string;
    eventData: any;
    timestamp: string;
  }>;
  activeUsersLastHour: number;
}

interface ModelStats {
  modelId: number;
  count: number;
  model: {
    id: number;
    name: string;
    provider: string;
    credit_cost: number;
  };
}

interface UserBehavior {
  activeUsers: Array<{
    userId: string;
    eventCount: number;
    user: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
  }>;
  eventDistribution: Array<{
    eventType: string;
    count: number;
  }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

function GrowthIndicator({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-green-600" : "text-red-600";
  
  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">
        {Math.abs(value).toFixed(1)}% {label}
      </span>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, growth, description }: {
  title: string;
  value: string | number;
  icon: any;
  growth?: number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {growth !== undefined && (
          <GrowthIndicator value={growth} label="vs last period" />
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();
  const [timeRange, setTimeRange] = useState("30");

  // Track page view
  useEffect(() => {
    if (isAuthenticated) {
      trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: '/analytics' });
    }
  }, [isAuthenticated, trackEvent]);

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

  // Dashboard analytics data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/admin/analytics/dashboard", timeRange],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 60000, // Refresh every minute
  });

  // Real-time analytics data
  const { data: realtimeData, isLoading: realtimeLoading } = useQuery<RealtimeData>({
    queryKey: ["/api/admin/analytics/realtime"],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Model analytics data
  const { data: modelData, isLoading: modelLoading } = useQuery<ModelStats[]>({
    queryKey: ["/api/admin/analytics/models", timeRange],
    enabled: isAuthenticated,
    retry: false,
  });

  // User behavior data
  const { data: userBehavior, isLoading: userBehaviorLoading } = useQuery<UserBehavior>({
    queryKey: ["/api/admin/analytics/users", timeRange],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || dashboardLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into platform performance and user behavior
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="users">User Behavior</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={dashboardData?.overview.totalUsers.toLocaleString() || "0"}
              icon={Users}
              growth={dashboardData?.overview.userGrowth}
              description="Registered platform users"
            />
            <StatCard
              title="Images Generated"
              value={dashboardData?.overview.totalImages.toLocaleString() || "0"}
              icon={Image}
              growth={dashboardData?.overview.imageGrowth}
              description="AI-generated images created"
            />
            <StatCard
              title="Total Revenue"
              value={`$${dashboardData?.overview.totalRevenue.toLocaleString() || "0"}`}
              icon={DollarSign}
              growth={dashboardData?.overview.revenueGrowth}
              description="Platform earnings to date"
            />
            <StatCard
              title="Active Users"
              value={realtimeData?.activeUsersLastHour || "0"}
              icon={Activity}
              description="Users active in last hour"
            />
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dashboardData?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Image Generation</CardTitle>
                <CardDescription>Daily image creation activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Bar dataKey="images" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Daily revenue from credit purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dashboardData?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [`$${value}`, "Revenue"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    dot={{ fill: '#ffc658' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Today's New Users"
              value={realtimeData?.today.newUsers || "0"}
              icon={Users}
              description="Users who joined today"
            />
            <StatCard
              title="Images Generated Today"
              value={realtimeData?.today.imagesGenerated || "0"}
              icon={Image}
              description="AI images created today"
            />
            <StatCard
              title="Today's Revenue"
              value={`$${realtimeData?.today.revenue || "0"}`}
              icon={DollarSign}
              description="Revenue earned today"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest user actions on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {realtimeData?.recentActivity?.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <div>
                        <div className="font-medium capitalize">
                          {activity.eventType.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {activity.eventData && typeof activity.eventData === 'object' 
                            ? JSON.stringify(activity.eventData).slice(0, 50) + '...'
                            : activity.eventData || 'No additional data'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {(!realtimeData?.recentActivity || realtimeData.recentActivity.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity to display
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Models</CardTitle>
                <CardDescription>Most used AI models by generation count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modelData?.slice(0, 10).map((model, index) => (
                    <div key={model.modelId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{model.model?.name || `Model ${model.modelId}`}</div>
                          <div className="text-sm text-muted-foreground">
                            {model.model?.provider} • {model.model?.credit_cost} credits
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">{model.count} images</Badge>
                    </div>
                  ))}
                  {(!modelData || modelData.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No model usage data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Model Usage Distribution</CardTitle>
                <CardDescription>Visual breakdown of model popularity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={modelData?.slice(0, 6) || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="model.name"
                    >
                      {(modelData || []).slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Most Active Users</CardTitle>
                <CardDescription>Users with highest platform engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userBehavior?.activeUsers?.slice(0, 10).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.user?.first_name} {user.user?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.user?.email}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">{user.eventCount} actions</Badge>
                    </div>
                  ))}
                  {(!userBehavior?.activeUsers || userBehavior.activeUsers.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No user activity data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Distribution</CardTitle>
                <CardDescription>Types of user actions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userBehavior?.eventDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="eventType" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Activity Trends</CardTitle>
              <CardDescription>Combined view of users, images, and active sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dashboardData?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="New Users"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="images" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Images Generated"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    name="Active Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}