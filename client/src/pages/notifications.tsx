import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Activity,
  CreditCard,
  Image,
  Gift,
  AlertCircle,
  Settings
} from "lucide-react";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  emailSent: boolean;
  createdAt: string;
}

interface UserActivity {
  id: number;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Fetch notifications
  const { data: notificationData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications', page],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/notifications?page=${page}&limit=20`);
      return response.json();
    },
  });

  // Fetch user activities
  const { data: activityData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/user/activities', page],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user/activities?page=${page}&limit=20`);
      return response.json();
    },
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/notifications/mark-all-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    },
  });

  // Toggle email notifications
  const toggleEmailNotificationsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("PATCH", `/api/user/email-notifications`, { enabled });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email notification settings updated",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <Gift className="h-4 w-4 text-green-500" />;
      case 'credit_low':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'image_generated':
        return <Image className="h-4 w-4 text-blue-500" />;
      case 'credits_purchased':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'weekly_summary':
        return <Activity className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'image_generated':
        return <Image className="h-4 w-4 text-green-500" />;
      case 'credits_purchased':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatActivityDescription = (activity: UserActivity) => {
    switch (activity.action) {
      case 'login':
        return "Logged into account";
      case 'image_generated':
        return `Generated image using ${activity.details?.modelName || 'AI model'}`;
      case 'credits_purchased':
        return `Purchased ${activity.details?.credits || 0} credits`;
      default:
        return activity.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Notifications</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
            
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm">Email Notifications</span>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  setEmailNotifications(checked);
                  toggleEmailNotificationsMutation.mutate(checked);
                }}
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notifications">
              Notifications
              {notificationData?.unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {notificationData.unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">Activity History</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            {notificationsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {notificationData?.notifications?.map((notification: Notification) => (
                    <Card key={notification.id} className={`${!notification.read ? 'border-primary' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getNotificationIcon(notification.type)}
                            <CardTitle className="text-sm">{notification.title}</CardTitle>
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs">New</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              disabled={notification.read}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {notificationData?.notifications?.length === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No notifications yet</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {activitiesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {activityData?.activities?.map((activity: UserActivity) => (
                    <Card key={activity.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {getActivityIcon(activity.action)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{formatActivityDescription(activity)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {activityData?.activities?.length === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No activity history yet</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}