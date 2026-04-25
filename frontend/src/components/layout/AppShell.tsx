/**
 * AppShell — root layout: sidebar (desktop) + bottom tab bar (mobile) + animated page content.
 */

import { AnimatePresence } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { BottomTabBar } from "./BottomTabBar";

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <div className="hidden md:flex">
        <SidebarNav />
      </div>

      {/* Main content — adds bottom padding on mobile to clear the tab bar */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>

      {/* Bottom tab bar — mobile only */}
      <BottomTabBar />
    </div>
  );
}
