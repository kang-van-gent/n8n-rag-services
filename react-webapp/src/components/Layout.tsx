import React, { useState, useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  // Start with sidebar closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // Handle initial sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      // Auto-close sidebar on mobile when resizing
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    // Set initial state based on screen size
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-900 dark:to-gray-800 aura-bg relative overflow-hidden">
      {/* Floating orbs */}
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div
        className={`flex-1 flex flex-col overflow-hidden relative z-10 transition-all duration-300 ease-out ${
          sidebarOpen ? "lg:ml-72" : "lg:ml-0"
        }`}
      >
        <Header onToggleSidebar={toggleSidebar} title={title} />

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
