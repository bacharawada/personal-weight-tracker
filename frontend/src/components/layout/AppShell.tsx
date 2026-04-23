/**
 * Application shell — left sidebar navigation + main content area.
 */

import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart2,
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="flex flex-col w-56 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        {/* Logo / app name */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-200 dark:border-gray-800">
          <BarChart2 size={22} className="text-blue-600 shrink-0" />
          <span className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
            Weight<br />Tracker
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle at bottom */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? "Light mode" : "Dark mode"}
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
