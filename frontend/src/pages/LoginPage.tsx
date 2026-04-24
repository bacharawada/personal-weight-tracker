/**
 * Landing / Login page.
 *
 * Shown to unauthenticated users. Presents two entry points:
 *   - "Sign in" → redirects to Keycloak (standard login/register forms)
 *   - "Sign in with Google" → redirects straight to Google via Keycloak
 *
 * The actual credentials are handled by Keycloak; this page only
 * initiates the OIDC authorization code flow with PKCE.
 */

import { useState } from "react";
import { motion } from "motion/react";
import { Scale, LogIn } from "lucide-react";

/** Minimal Google "G" logo as an inline SVG. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState<"email" | "google" | null>(null);

  async function handleLogin() {
    setIsLoading("email");
    await login();
  }

  async function handleGoogleLogin() {
    setIsLoading("google");
    await loginWithGoogle();
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
          <button
            onClick={handleLogin}
            disabled={isLoading !== null}
            className="
              flex items-center justify-center gap-2.5
              w-full py-3 px-4 rounded-xl font-medium text-sm
              bg-blue-500 hover:bg-blue-600 active:bg-blue-700
              text-white
              transition-colors duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          >
            {isLoading === "email" ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Sign in with email
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading !== null}
            className="
              flex items-center justify-center gap-2.5
              w-full py-3 px-4 rounded-xl font-medium text-sm
              bg-white hover:bg-gray-50 active:bg-gray-100
              dark:bg-gray-800 dark:hover:bg-gray-750 dark:active:bg-gray-700
              text-gray-700 dark:text-gray-200
              border border-gray-300 dark:border-gray-600
              transition-colors duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          >
            {isLoading === "google" ? (
              <span className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-500 rounded-full animate-spin" />
            ) : (
              <GoogleIcon className="w-4 h-4" />
            )}
            Sign in with Google
          </button>
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
