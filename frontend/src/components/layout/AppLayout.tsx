/**
 * AppLayout — authenticated app shell with onboarding wizard overlay.
 *
 * Sits between ProtectedRoute and AppShell. Fetches the user profile
 * once to decide whether to show the onboarding wizard. Once the wizard
 * completes (or the user skips), it disappears and the app is fully
 * accessible.
 */

import { useWeightTracker } from "../../context/WeightTrackerContext";
import { useOnboarding } from "../../hooks/useOnboarding";
import { OnboardingWizard } from "../onboarding/OnboardingWizard";
import { AppShell } from "./AppShell";

export function AppLayout() {
  const { accent } = useWeightTracker();
  const { showWizard, dismissWizard } = useOnboarding();

  return (
    <>
      <AppShell />
      {showWizard && (
        <OnboardingWizard onComplete={dismissWizard} accent={accent} />
      )}
    </>
  );
}
