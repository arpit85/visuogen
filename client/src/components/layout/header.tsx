import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChevronDown, LogOut, User, Menu } from "lucide-react";
import { useLocation } from "wouter";

interface HeaderProps {
  title: string;
  subtitle: string;
  onMenuToggle?: () => void;
}

export default function Header({ title, subtitle, onMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.clear();
      window.location.href = '/';
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout on error
      window.location.href = '/';
    }
  };

  return (
    <header className="flex-shrink-0 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={onMenuToggle}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block truncate">
              {subtitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 sm:space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
              >
                <img 
                  src={(user as any)?.profileImageUrl || `https://ui-avatars.com/api/?name=${(user as any)?.firstName || 'User'}+${(user as any)?.lastName || ''}&background=6366f1&color=fff`} 
                  alt="User Profile" 
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block truncate max-w-24 lg:max-w-none">
                  {(user as any)?.firstName} {(user as any)?.lastName}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 hidden sm:block flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => setLocation('/profile-settings')}
              >
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
