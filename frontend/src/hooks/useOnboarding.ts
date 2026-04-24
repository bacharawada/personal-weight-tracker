/**
 * useOnboarding — fetches the user profile on mount and tracks whether
 * the onboarding wizard should be shown.
 *
 * Returns:
 *   showWizard   — true when the user exists and hasn't completed onboarding
 *   dismissWizard — call this after the wizard's onComplete to hide it
 *   isLoading    — true during the initial profile fetch
 */

import { useCallback, useEffect, useState } from "react";
import { getMe } from "../lib/api";

interface OnboardingState {
  showWizard: boolean;
  dismissWizard: () => void;
  isLoading: boolean;
}

export function useOnboarding(): OnboardingState {
  const [showWizard, setShowWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((profile) => {
        setShowWizard(!profile.onboarding_completed);
      })
      .catch(() => {
        // If the profile fetch fails (e.g. auth not yet ready), don't show wizard.
        setShowWizard(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const dismissWizard = useCallback(() => setShowWizard(false), []);

  return { showWizard, dismissWizard, isLoading };
}
