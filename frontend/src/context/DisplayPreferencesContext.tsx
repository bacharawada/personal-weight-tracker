/**
 * Display preferences (weight unit + date format) and the formatters bound to
 * them.
 *
 * Kept separate from `WeightTrackerContext` on purpose: the public share page
 * lives entirely outside the authenticated app shell, yet it renders the same
 * charts and therefore needs the same formatters — fed by the link owner's
 * preferences instead of the visitor's (they have no account).
 *
 * The context has a default value, so a component that reads it outside any
 * provider falls back to `DEFAULT_DISPLAY_PREFERENCES` rather than throwing.
 */

import { createContext, useContext, useMemo } from "react";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  formatIsoDate,
  formatIsoDateShort,
  formatMs,
  formatMsShort,
} from "../lib/dates";
import type { DateOrder, DateSeparator, DisplayPreferences, WeightUnit } from "../lib/types";

interface DisplayPreferencesContextValue {
  unit: WeightUnit;
  dateOrder: DateOrder;
  dateSeparator: DateSeparator;

  /** Format an ISO `YYYY-MM-DD` date. */
  formatDate: (iso: string) => string;
  /** Format an ISO date without the year (axis tick labels). */
  formatDateShort: (iso: string) => string;
  /** Format an epoch-millisecond value (chart hover points). */
  formatDateMs: (ms: number) => string;
  /** Format an epoch-millisecond value without the year (axis ticks). */
  formatDateMsShort: (ms: number) => string;
}

function buildValue(
  preferences: DisplayPreferences,
): DisplayPreferencesContextValue {
  const { unit_preference: unit, date_order: order, date_separator: sep } = preferences;
  return {
    unit,
    dateOrder: order,
    dateSeparator: sep,
    formatDate: (iso) => formatIsoDate(iso, order, sep),
    formatDateShort: (iso) => formatIsoDateShort(iso, order, sep),
    formatDateMs: (ms) => formatMs(ms, order, sep),
    formatDateMsShort: (ms) => formatMsShort(ms, order, sep),
  };
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextValue>(
  buildValue(DEFAULT_DISPLAY_PREFERENCES),
);

interface DisplayPreferencesProviderProps {
  preferences: DisplayPreferences;
  children: React.ReactNode;
}

export function DisplayPreferencesProvider({
  preferences,
  children,
}: DisplayPreferencesProviderProps) {
  const value = useMemo(
    () => buildValue(preferences),
    // Depend on the three primitive fields rather than the object identity, so
    // a fresh profile object with unchanged preferences does not invalidate the
    // formatters (and re-render every chart).
    [
      preferences.unit_preference,
      preferences.date_order,
      preferences.date_separator,
    ],
  );

  return (
    <DisplayPreferencesContext.Provider value={value}>
      {children}
    </DisplayPreferencesContext.Provider>
  );
}

export function useDisplayPreferences(): DisplayPreferencesContextValue {
  return useContext(DisplayPreferencesContext);
}
