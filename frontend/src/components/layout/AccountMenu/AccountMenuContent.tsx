/**
 * AccountMenuContent — the panel behind the user-name button.
 *
 * Shared by the sidebar and the mobile tab bar so both surfaces expose the same
 * account actions: identity, profile link, appearance/language switches, sign out.
 * The switches are plain buttons rather than menu items — flipping a preference
 * should not dismiss the menu.
 */

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, UserCog } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import type { Language } from "../../../i18n/config";
import { LANGUAGE_LABELS } from "../../../i18n/config";
import { Theme } from "../../../lib/types";
import { FlagFrIcon } from "../../ui/flag-fr-icon";
import { FlagGbIcon } from "../../ui/flag-gb-icon";
import { IconSwitch, type IconSwitchOption } from "../../ui/icon-switch";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../ui/dropdown-menu";

interface AccountMenuContentProps {
  side: "top" | "right";
  align: "start" | "center" | "end";
  className?: string;
}

export function AccountMenuContent({ side, align, className }: AccountMenuContentProps) {
  const { t, i18n } = useTranslation("nav");
  const { isDark, toggleTheme } = useWeightTracker();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const currentLanguage: Language = i18n.language.startsWith("fr") ? "fr" : "en";

  const displayName =
    user?.name ||
    (user?.email ? user.email.split("@")[0] : t("account.fallback"));
  const displayEmail = user?.email ?? "";

  const themeOptions: readonly [IconSwitchOption<Theme>, IconSwitchOption<Theme>] = [
    { value: Theme.Light, icon: <Sun size={14} />, label: t("theme.light") },
    { value: Theme.Dark, icon: <Moon size={14} />, label: t("theme.dark") },
  ];

  const languageOptions: readonly [
    IconSwitchOption<Language>,
    IconSwitchOption<Language>,
  ] = [
    {
      value: "en",
      icon: <FlagGbIcon className="h-4 w-4" />,
      label: LANGUAGE_LABELS.en,
    },
    {
      value: "fr",
      icon: <FlagFrIcon className="h-4 w-4" />,
      label: LANGUAGE_LABELS.fr,
    },
  ];

  return (
    <DropdownMenuContent side={side} align={align} className={className}>
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

      <DropdownMenuItem onSelect={() => navigate("/profile")}>
        <UserCog size={14} />
        {t("account.profile")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />

      <div className="flex items-center justify-between gap-3 px-2.5 py-1.5">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {t("theme.label")}
        </span>
        <IconSwitch
          options={themeOptions}
          value={isDark ? Theme.Dark : Theme.Light}
          onChange={(next) => {
            if (next !== (isDark ? Theme.Dark : Theme.Light)) toggleTheme();
          }}
          ariaLabel={t("theme.label")}
          size="sm"
        />
      </div>

      <div className="flex items-center justify-between gap-3 px-2.5 py-1.5">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {t("language.label")}
        </span>
        <IconSwitch
          options={languageOptions}
          value={currentLanguage}
          onChange={(next) => void i18n.changeLanguage(next)}
          ariaLabel={t("language.label")}
          size="sm"
        />
      </div>
      <DropdownMenuSeparator />

      <DropdownMenuItem
        className="text-red-500 dark:text-red-400 focus:text-red-600 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-900/20"
        onSelect={() => logout()}
      >
        <LogOut size={14} />
        {t("account.signOut")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
