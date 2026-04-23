/**
 * Application shell — collapsible left sidebar + main content area.
 */

import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutDashboard,
  Moon,
  Settings,
  Sun,
  TrendingDown,
} from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { cn } from "../../lib/cn";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/analysis", label: "Analysis", icon: TrendingDown },
  { to: "/data", label: "Data", icon: Database },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const { isDark, toggleTheme } = useWeightTracker();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200",
          collapsed ? "w-14" : "w-52"
        )}
      >
        {/* Header: logo + title + collapse button */}
        <div className={cn(
          "flex items-center border-b border-gray-200 dark:border-gray-800 h-14",
          collapsed ? "justify-center px-0" : "px-4 gap-2"
        )}>
          {!collapsed && (
            <>
              <BarChart2 size={20} className="text-blue-600 shrink-0" />
              <span className="font-bold text-gray-900 dark:text-white text-sm whitespace-nowrap">
                Weight Tracker
              </span>
            </>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              collapsed ? "" : "ml-auto"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-2 py-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={toggleTheme}
            title={isDark ? "Light mode" : "Dark mode"}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors w-full",
              collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
            )}
          >
            {isDark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
            {!collapsed && (isDark ? "Light mode" : "Dark mode")}
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
