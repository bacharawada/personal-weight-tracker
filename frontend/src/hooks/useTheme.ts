/**
 * Theme hook — manages light/dark mode.
 *
 * For a signed-in user the server owns the preference (`users.theme`); this
 * hook keeps a localStorage copy so the very first paint is already the right
 * theme, before the profile request has resolved. `WeightTrackerContext`
 * reconciles the two and persists changes. The public share page, which has no
 * account, uses this hook on its own with localStorage as the only store.
 */

import { useCallback, useEffect, useState } from "react";
import { Theme } from "../lib/types";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return stored === Theme.Dark ? Theme.Dark : Theme.Light;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === Theme.Dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === Theme.Light ? Theme.Dark : Theme.Light));
  }, []);

  return { theme, toggle, setTheme, isDark: theme === Theme.Dark };
}
