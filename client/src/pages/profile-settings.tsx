import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, Crown, CreditCard, Settings, Save, AlertCircle, CheckCircle } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  credits: number;
  planId: number;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserPlan {
  id: number;
  name: string;
  description: string;
  price: string;
  creditsPerMonth: number;
}

export default function ProfileSettings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

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

  // Get user profile data
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  // Get user plan data
  const { data: userPlan, isLoading: planLoading } = useQuery<UserPlan>({
    queryKey: ["/api/user/plan"],
    enabled: isAuthenticated,
  });

  // Get user credits
  const { data: creditsData } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits"],
    enabled: isAuthenticated,
  });

  // Initialize form data when user profile is loaded
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || "");
      setLastName(userProfile.lastName || "");
      setEmail(userProfile.email || "");
    }
  }, [userProfile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: { firstName: string; lastName: string; email: string }) => {
      const response = await apiRequest("PUT", "/api/user/profile", profileData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      // Invalidate user data to refresh the info
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (profileLoading || planLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account information and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and display name
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <img 
                      src={userProfile?.profileImageUrl || `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=6366f1&color=fff`} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Profile Picture</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Profile pictures are managed through your Replit account
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Email changes are managed through your Replit account
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full md:w-auto"
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  View your account details and registration information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</Label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">{userProfile?.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Type</Label>
                    <div className="flex items-center gap-2">
                      {userProfile?.isAdmin && (
                        <Badge variant="default">Administrator</Badge>
                      )}
                      <Badge variant="outline">Regular User</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</Label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</Label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {userProfile?.updatedAt ? new Date(userProfile.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Account Status */}
          <div className="space-y-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {userPlan?.name || 'Free Plan'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {userPlan?.description || 'Basic access to AI image generation'}
                    </p>
                  </div>
                  
                  {userPlan && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Monthly Price</span>
                        <span className="text-lg font-bold text-primary">{userPlan.price}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Monthly Credits</span>
                        <span className="text-sm font-semibold">{userPlan.creditsPerMonth}</span>
                      </div>
                    </div>
                  )}

                  <Button variant="outline" className="w-full" onClick={() => window.location.href = '/subscription'}>
                    {userPlan ? 'Manage Subscription' : 'Upgrade Plan'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Credits Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Credits Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-3">
                  <div className="text-3xl font-bold text-primary">
                    {creditsData?.credits || 0}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Available credits for image generation
                  </p>
                  
                  <Button variant="outline" className="w-full" onClick={() => window.location.href = '/purchase-credits'}>
                    Buy More Credits
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/generate'}>
                  Generate Images
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/gallery'}>
                  View Gallery
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/redeem-coupon'}>
                  Redeem Coupon
                </Button>
                {userProfile?.isAdmin && (
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/admin'}>
                    Admin Panel
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}