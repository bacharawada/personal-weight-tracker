/**
 * Landing / Login page.
 *
 * Shown to unauthenticated users. Presents two entry points:
 *   - "Sign in" → redirects to Keycloak (standard login/register forms)
 *   - "Sign in with Google" → redirects to Keycloak with kc_idp_hint=google,
 *     which skips the IdP chooser and lands straight on Google
 *
 * The actual credentials are handled by Keycloak; this page only
 * initiates the OIDC authorization code flow with PKCE.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { LogIn, Scale } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { GoogleIcon } from "../components/ui/google-icon";

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const { t } = useTranslation("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleLogin() {
    setIsLoading(true);
    await login();
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    await loginWithGoogle();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 flex flex-col gap-6 sm:gap-8"
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-400/10">
            <Scale className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            {t("login.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            {t("login.tagline")}
          </p>
        </div>

        {/* Auth buttons */}
        <div className="flex flex-col gap-3">
          {/* Primary: email / password */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleLogin}
            disabled={isLoading || isGoogleLoading}
            className="w-full rounded-xl"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {t("login.signInWithEmail")}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t("login.or")}
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Google — brokered through Keycloak via kc_idp_hint */}
          <Button
            variant="secondary"
            size="lg"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            className="w-full rounded-xl"
            aria-label={t("login.signInWithGoogleAria")}
          >
            {isGoogleLoading ? (
              <span className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-500 rounded-full animate-spin" />
            ) : (
              <GoogleIcon className="w-4 h-4" />
            )}
            {t("login.signInWithGoogle")}
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          {t("login.footerNote")}
        </p>
      </motion.div>

      {/* Attribution + about link */}
      <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 flex items-center gap-2">
        <span>{t("login.attribution")}</span>
        <span aria-hidden="true">&middot;</span>
        <Link
          to="/about"
          className="underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
        >
          {t("login.about")}
        </Link>
      </p>
    </div>
  );
}
