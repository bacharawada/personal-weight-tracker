/**
 * Application shell — collapsible left sidebar + animated page transitions.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  const { isDark, toggleTheme, accent } = useWeightTracker();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // 12% opacity background for the active pill
  const accentBg = `${accent}1e`;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-[width] duration-200 ease-in-out",
          collapsed ? "w-14" : "w-52",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center border-b border-gray-200 dark:border-gray-800 h-14 overflow-hidden",
            collapsed ? "justify-center px-0" : "px-4 gap-2",
          )}
        >
          {!collapsed && (
            <AnimatePresence initial={false}>
              <BarChart2
                size={20}
                style={{ color: accent }}
                className="shrink-0"
              />
              <motion.span
                key="title"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="font-bold text-sm whitespace-nowrap overflow-hidden"
                style={{ color: accent }}
              >
                Weight Tracker
              </motion.span>
            </AnimatePresence>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0",
              collapsed ? "" : "ml-auto",
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-1 relative">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center rounded-lg text-sm font-medium transition-colors z-10",
                  collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                  isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Animated background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ backgroundColor: accentBg }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 35,
                      }}
                    />
                  )}
                  <span
                    className="relative z-10 shrink-0"
                    style={isActive ? { color: accent } : {}}
                  >
                    <Icon size={18} />
                  </span>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key={label}
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.13 }}
                        className="relative z-10 overflow-hidden whitespace-nowrap"
                        style={isActive ? { color: accent } : {}}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={toggleTheme}
            title={isDark ? "Light mode" : "Dark mode"}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors w-full overflow-hidden",
              collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
            )}
          >
            {isDark ? (
              <Sun size={18} className="shrink-0" />
            ) : (
              <Moon size={18} className="shrink-0" />
            )}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="theme-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.13 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {isDark ? "Light mode" : "Dark mode"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </aside>

      {/* ── Main content with page transitions ─────────────── */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
    </div>
  );
}
