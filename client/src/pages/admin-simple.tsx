import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminSimple() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('Admin panel debug:', { isAuthenticated, isLoading });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Loading Admin Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Checking authentication...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Access Required</CardTitle>
            <CardDescription>
              You need to be logged in to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Please log in with an administrator account to manage the platform
            </p>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="w-full"
            >
              Log In to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your AI image generator platform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Panel Working</CardTitle>
          <CardDescription>
            The admin panel is now loading successfully without JavaScript errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Authentication successful! You can now access admin features.</p>
          <Button 
            onClick={() => window.location.href = "/admin"}
            className="mt-4"
          >
            Go to Full Admin Panel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}