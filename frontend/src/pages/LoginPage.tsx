/**
 * Landing / Login page.
 *
 * Shown to unauthenticated users. Presents two entry points:
 *   - "Sign in" → redirects to Keycloak (standard login/register forms)
 *   - "Sign in with Google" → coming soon (disabled until IdP is configured)
 *
 * The actual credentials are handled by Keycloak; this page only
 * initiates the OIDC authorization code flow with PKCE.
 */

import { useState } from "react";
import { motion } from "motion/react";
import { LogIn, Scale } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { GoogleIcon } from "../components/ui/google-icon";

export function LoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setIsLoading(true);
    await login();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 flex flex-col gap-8"
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-400/10">
            <Scale className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            Weight Tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Track your weight, visualise your progress, and stay on top of your
            goals — all in one place.
          </p>
        </div>

        {/* Auth buttons */}
        <div className="flex flex-col gap-3">
          {/* Primary: email / password */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full rounded-xl"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Sign in with email
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Google — disabled until IdP is configured in Keycloak */}
          <div className="relative group">
            <Button
              variant="secondary"
              size="lg"
              disabled
              className="w-full rounded-xl"
              aria-label="Sign in with Google — coming soon"
            >
              <GoogleIcon className="w-4 h-4" />
              Sign in with Google
            </Button>
            {/* Tooltip */}
            <div
              role="tooltip"
              className="absolute left-1/2 -translate-x-1/2 -bottom-9 px-2.5 py-1 rounded-md
                         bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
                         text-xs whitespace-nowrap
                         opacity-0 group-hover:opacity-100
                         transition-opacity duration-150 pointer-events-none
                         after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2
                         after:-top-1 after:border-4 after:border-transparent
                         after:border-b-gray-900 dark:after:border-b-gray-100"
            >
              Coming soon
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          New here? Choose "Sign in with email" and create a free account.
        </p>
      </motion.div>

      {/* Attribution */}
      <p className="mt-6 text-xs text-gray-400 dark:text-gray-600">
        Weight Tracker &mdash; personal health dashboard
      </p>
    </div>
  );
}
