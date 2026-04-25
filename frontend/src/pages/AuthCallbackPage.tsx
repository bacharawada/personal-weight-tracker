/**
 * OIDC redirect callback page — /auth/callback
 *
 * After Keycloak redirects back here with the authorization code,
 * the AuthProvider's useEffect handles the token exchange.  This page
 * just renders a loading indicator while that completes.
 */

import { Spinner } from "../components/ui/Spinner";

export function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
        <Spinner size={32} />
        <p className="text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
