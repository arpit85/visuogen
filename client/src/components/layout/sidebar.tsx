import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Wand2, 
  Image, 
  Crown, 
  Settings, 
  Sparkles,
  Coins
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Generate Images", href: "/generate", icon: Wand2 },
  { name: "My Gallery", href: "/gallery", icon: Image },
  { name: "Subscription", href: "/subscription", icon: Crown },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: credits } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits"],
  });

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 fixed h-full z-10">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">AIImageForge</h1>
        </div>
      </div>
      
      <nav className="px-4 pb-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Button
                key={item.name}
                variant="ghost"
                className={cn(
                  "w-full justify-start transition-all duration-200",
                  isActive
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "text-gray-600 hover:text-primary hover:bg-gray-50"
                )}
                onClick={() => setLocation(item.href)}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            );
          })}
          
          {user?.isAdmin && (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start transition-all duration-200",
                location === "/admin"
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "text-gray-600 hover:text-primary hover:bg-gray-50"
              )}
              onClick={() => setLocation("/admin")}
            >
              <Settings className="mr-3 h-5 w-5" />
              Admin Panel
            </Button>
          )}
        </div>
        
        <div className="mt-8 p-4 bg-gradient-to-r from-primary to-secondary rounded-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Credits Balance</span>
            <Coins className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold">{credits?.credits || 0}</div>
          <p className="text-xs opacity-90 mt-1">
            {user?.planId ? 'Pro Plan Active' : 'Free Plan'}
          </p>
        </div>
      </nav>
    </div>
  );
}
