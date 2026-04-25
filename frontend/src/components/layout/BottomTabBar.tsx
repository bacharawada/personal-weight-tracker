/**
 * BottomTabBar — mobile-only bottom navigation bar.
 *
 * Visible only on screens smaller than `md` (768px). Replaces the sidebar
 * for navigation on phones. Shows 4 nav tabs + a profile/actions button.
 */

import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import {
  Database,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  TrendingDown,
  CircleUser,
} from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/cn";
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

export function BottomTabBar() {
  const { isDark, toggleTheme } = useWeightTracker();
  const { user, logout } = useAuth();

  const displayName =
    user?.name || (user?.email ? user.email.split("@")[0] : "Account");
  const displayEmail = user?.email ?? "";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-bottom">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors relative",
                isActive
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-400 dark:text-gray-500",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="bottom-tab-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                    style={{ backgroundColor: "var(--color-accent)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span style={isActive ? { color: "var(--color-accent)" } : {}}>
                  <Icon size={20} />
                </span>
                <span
                  className="leading-none"
                  style={isActive ? { color: "var(--color-accent)" } : {}}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* Profile / actions slot */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-400 dark:text-gray-500 transition-colors">
              <CircleUser size={20} />
              <span className="leading-none">Account</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-1 mr-2">
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
            <DropdownMenuItem onClick={toggleTheme}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              {isDark ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
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
    </nav>
  );
}
