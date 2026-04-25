/**
 * AppShell — root layout: sidebar + animated page content area.
 */

import { AnimatePresence } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <SidebarNav />
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
    </div>
  );
}
