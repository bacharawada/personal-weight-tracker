/**
 * BottomTabBar — mobile-only bottom navigation bar.
 *
 * Visible only on screens smaller than `md` (768px). Replaces the sidebar
 * for navigation on phones. Shows 4 nav tabs + a profile/actions button.
 */

import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Database,
  LayoutDashboard,
  Settings,
  TrendingDown,
  CircleUser,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { DropdownMenu, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AccountMenuContent } from "./AccountMenu";

const NAV_ITEMS = [
  { to: "/", labelKey: "links.dashboard", icon: LayoutDashboard, end: true },
  { to: "/analysis", labelKey: "links.analysis", icon: TrendingDown, end: false },
  { to: "/data", labelKey: "links.data", icon: Database, end: false },
  { to: "/settings", labelKey: "links.settings", icon: Settings, end: false },
] as const;

export function BottomTabBar() {
  const { t } = useTranslation("nav");

  // Fixed-height, centred label box: keeps the icons row-aligned across tabs
  // even when a label wraps to two lines (e.g. French "Tableau de bord").
  const tabLabelClass =
    "flex h-[26px] w-full items-center justify-center text-center text-[10px] leading-[1.15]";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-bottom">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-0.5 font-medium transition-colors relative",
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
                    className="absolute top-0 left-0 right-0 flex justify-center"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  >
                    <div
                      className="h-0.5 w-8 rounded-full"
                      style={{ backgroundColor: "var(--color-accent)" }}
                    />
                  </motion.div>
                )}
                <span style={isActive ? { color: "var(--color-accent)" } : {}}>
                  <Icon size={20} />
                </span>
                <span
                  className={tabLabelClass}
                  style={isActive ? { color: "var(--color-accent)" } : {}}
                >
                  <span className="line-clamp-2">{t(labelKey)}</span>
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* Profile / actions slot */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-0.5 font-medium text-gray-400 dark:text-gray-500 transition-colors">
              <CircleUser size={20} />
              <span className={tabLabelClass}>
                <span className="line-clamp-2">{t("account.fallback")}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <AccountMenuContent side="top" align="end" className="mb-1 mr-2" />
        </DropdownMenu>
      </div>
    </nav>
  );
}
