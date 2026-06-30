/**
 * layouts/MainLayout.jsx
 * Header is truly fixed/static — never scrolls on any screen size.
 * The page content area scrolls independently below the header.
 */

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 68 : 260;

  return (
    <div className="h-screen overflow-hidden bg-surface-100 flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(v => !v)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-primary-900/50 z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/*
       * Right column: fills remaining width, never scrolls itself.
       * Header stays at top, main scrolls independently.
       */}
      <div
        className="flex flex-col h-screen min-w-0 transition-all duration-300"
        style={{
          marginLeft: `${sidebarWidth}px`,
          width: `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        {/* Header: part of the flex column, never pushed by scroll */}
        <Header onMenuToggle={() => setMobileSidebarOpen(true)} />

        {/* Scrollable content area — only this div scrolls */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
