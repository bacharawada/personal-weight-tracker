/**
 * SidebarNav — collapsible left sidebar.
 *
 * Contains the app logo/title, nav links, theme toggle and user profile
 * dropdown. Extracted from AppShell to keep the shell itself thin.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NavLink } from "react-router-dom";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  Database,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  TrendingDown,
} from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/analysis", label: "Analysis", icon: TrendingDown },
  { to: "/data", label: "Data", icon: Database },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const { isDark, toggleTheme } = useWeightTracker();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const displayName =
    user?.name || (user?.email ? user.email.split("@")[0] : "Account");
  const displayEmail = user?.email ?? "";

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-[width] duration-200 ease-in-out",
        collapsed ? "w-14" : "w-52",
      )}
    >
      {/* ── Header / logo ──────────────────────────────────── */}
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
              style={{ color: "var(--color-accent)" }}
              className="shrink-0"
            />
            <motion.span
              key="title"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="font-bold text-sm whitespace-nowrap overflow-hidden"
              style={{ color: "var(--color-accent)" }}
            >
              Weight Tracker
            </motion.span>
          </AnimatePresence>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed((c) => !c)}
          className={cn("shrink-0 text-gray-400", collapsed ? "" : "ml-auto")}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
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
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span
                  className="relative z-10 shrink-0"
                  style={isActive ? { color: "var(--color-accent)" } : {}}
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
                      style={isActive ? { color: "var(--color-accent)" } : {}}
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

      {/* ── Theme toggle ───────────────────────────────────── */}
      <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-800">
        <Button
          variant="ghost"
          onClick={toggleTheme}
          title={isDark ? "Light mode" : "Dark mode"}
          className={cn(
            "text-sm font-medium text-gray-600 dark:text-gray-400 w-full overflow-hidden",
            collapsed ? "justify-center p-2 h-auto" : "gap-3 px-3 py-2 h-auto",
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
        </Button>
      </div>

      {/* ── User profile dropdown ──────────────────────────── */}
      <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              title={
                collapsed
                  ? `${displayName}${displayEmail ? ` — ${displayEmail}` : ""}`
                  : undefined
              }
              className={cn(
                "w-full overflow-hidden text-gray-700 dark:text-gray-300",
                collapsed
                  ? "justify-center p-2 h-auto"
                  : "justify-start gap-3 px-3 py-2 h-auto",
              )}
            >
              <CircleUser size={18} className="shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    key="user-info"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.13 }}
                    className="overflow-hidden whitespace-nowrap flex flex-col items-start min-w-0"
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px]">
                      {displayName}
                    </span>
                    {displayEmail && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                        {displayEmail}
                      </span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="right" align="end">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {displayName}
              </span>
              {displayEmail && (
                <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                  {displayEmail}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500 dark:text-red-400 focus:text-red-600 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-900/20"
              onSelect={() => logout()}
            >
              <LogOut size={14} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
