import { useState } from "react";
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
  Coins,
  Menu,
  X,
  Share2,
  Layers
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Generate Images", href: "/generate", icon: Wand2 },
  { name: "Batch Generation", href: "/batch", icon: Layers },
  { name: "My Gallery", href: "/gallery", icon: Image },
  { name: "Sharing", href: "/sharing", icon: Share2 },
  { name: "Buy Credits", href: "/purchase-credits", icon: Coins },
  { name: "Subscription", href: "/subscription", icon: Crown },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: credits } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits"],
  });

  const handleNavigation = (href: string) => {
    setLocation(href);
    if (onClose) onClose(); // Close mobile menu after navigation
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        // Base styles
        "w-64 bg-white dark:bg-gray-900 shadow-lg border-r border-gray-200 dark:border-gray-700",
        "flex flex-col h-full z-50",
        // Desktop styles (lg and up)
        "lg:translate-x-0 lg:static lg:shadow-none",
        // Mobile styles (below lg)
        "fixed top-0 left-0 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header section */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">AIImageForge</h1>
            </div>
            
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-1"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Navigation section */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-10 px-3 transition-all duration-200",
                    "hover:bg-gray-50 dark:hover:bg-gray-800",
                    isActive
                      ? "bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  )}
                  onClick={() => handleNavigation(item.href)}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Button>
              );
            })}
            
            {(user as any)?.isAdmin && (
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start h-10 px-3 transition-all duration-200",
                  "hover:bg-gray-50 dark:hover:bg-gray-800",
                  location === "/admin"
                    ? "bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                )}
                onClick={() => handleNavigation("/admin")}
              >
                <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate">Admin Panel</span>
              </Button>
            )}
          </div>
        </nav>
        
        {/* Credits section */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="p-4 bg-gradient-to-r from-primary to-secondary rounded-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Credits Balance</span>
              <Coins className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{credits?.credits || 0}</div>
            <p className="text-xs opacity-90 mt-1">
              {(user as any)?.planId ? 'Pro Plan Active' : 'Free Plan'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
