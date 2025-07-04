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
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <Header 
          title={title} 
          subtitle={subtitle} 
          onMenuToggle={toggleSidebar}
        />
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}