import { useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function ResponsiveLayout({ children, title, subtitle }: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <Header 
            title={title} 
            subtitle={subtitle} 
            onMenuToggle={toggleSidebar}
          />
          
          {/* Main content with proper scrolling */}
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}