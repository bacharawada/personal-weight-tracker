/**
 * OIDC authentication context using oidc-client-ts.
 *
 * Provides a UserManager configured against the Keycloak realm and
 * exposes auth state + actions to the whole app via useAuth().
 *
 * Flow:
 *   1. On mount, try to load a cached user from session storage.
 *   2. If the URL contains an OIDC callback code, complete the sign-in.
 *   3. Otherwise the user is unauthenticated — ProtectedRoute redirects
 *      to the landing page, which calls login() or loginWithGoogle().
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, UserManager, WebStorageStateStore } from "oidc-client-ts";
import { setTokenGetter } from "../lib/api";

// ---------------------------------------------------------------------------
// UserManager configuration
// ---------------------------------------------------------------------------

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080";
const REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? "weight-tracker";
const CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "weight-tracker-frontend";

const AUTHORITY = `${KEYCLOAK_URL}/realms/${REALM}`;

const userManager = new UserManager({
  authority: AUTHORITY,
  client_id: CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: "code",
  scope: "openid profile email",
  // Store tokens in sessionStorage (not localStorage) so they are
  // cleared when the browser tab is closed.
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // Automatically renew the access token before it expires.
  automaticSilentRenew: true,
  // Silent renew uses an invisible iframe; the callback page handles it.
  silent_redirect_uri: `${window.location.origin}/auth/silent-renew`,
  // Load user info from the OIDC userinfo endpoint.
  loadUserInfo: true,
});

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
  accessToken: string;
}

interface AuthContextValue {
  /** Resolved user, or null if not authenticated. */
  user: AuthUser | null;
  /** True while the initial session check is in progress. */
  isLoading: boolean;
  /** Redirect to Keycloak login (email/password form). */
  login: () => Promise<void>;
  /** Redirect to Keycloak login pre-selected to Google IdP. */
  loginWithGoogle: () => Promise<void>;
  /** Log out locally and redirect to Keycloak logout. */
  logout: () => Promise<void>;
  /** Raw access token string for attaching to API requests. */
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helper: map oidc-client-ts User → our AuthUser
// ---------------------------------------------------------------------------

function toAuthUser(oidcUser: User): AuthUser {
  return {
    sub: oidcUser.profile.sub,
    email: oidcUser.profile.email,
    name: oidcUser.profile.name,
    accessToken: oidcUser.access_token,
  };
}

// Module-level promise: prevents the OIDC callback from being processed twice.
// React 18 StrictMode double-invokes effects in development, which would
// cause signinRedirectCallback() to exchange the same authorization code
// twice — the second attempt always fails with "Code not valid" (400).
// By storing the promise, the second invocation can await the same result
// instead of racing or discarding it.
let callbackPromise: Promise<User> | null = null;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, _setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  // Keep a ref to the latest user for synchronous getAccessToken().
  // Updated synchronously alongside state so the token is available
  // immediately when child components mount and fire API calls.
  const userRef = useRef<AuthUser | null>(null);

  const setUser = useCallback((u: AuthUser | null) => {
    userRef.current = u;
    _setUser(u);
  }, []);

  // Register the token getter once so lib/api.ts can attach Bearer tokens.
  useEffect(() => {
    setTokenGetter(() => userRef.current?.accessToken ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      console.log("[Auth] init — pathname:", location.pathname);
      try {
        // If this is the OIDC redirect callback, finish the sign-in.
        // We store the promise at module level so that React 18 StrictMode's
        // second effect invocation awaits the *same* token exchange instead
        // of attempting a second one (authorization codes are single-use).
        if (location.pathname === "/auth/callback") {
          console.log("[Auth] Processing OIDC callback, existing promise:", !!callbackPromise);
          if (!callbackPromise) {
            callbackPromise = userManager.signinRedirectCallback();
          }
          const oidcUser = await callbackPromise;
          console.log("[Auth] Token exchange complete, cancelled:", cancelled, "sub:", oidcUser.profile.sub);
          if (!cancelled) {
            setUser(toAuthUser(oidcUser));
            setIsLoading(false);
            // Navigate to the original destination using React Router
            // (not history.replaceState, which doesn't trigger route changes).
            const returnTo = (oidcUser.state as string | undefined) || "/";
            // If the saved path was /login or /auth/callback, go to / instead.
            const destination =
              returnTo === "/login" || returnTo.startsWith("/auth/")
                ? "/"
                : returnTo;
            console.log("[Auth] Navigating to:", destination);
            navigate(destination, { replace: true });
          }
          return;
        }

        // Try to load an existing session.
        console.log("[Auth] Loading existing session...");
        const oidcUser = await userManager.getUser();
        console.log("[Auth] Cached user:", oidcUser ? "found (expired=" + oidcUser.expired + ")" : "none");
        if (!cancelled) {
          setUser(oidcUser && !oidcUser.expired ? toAuthUser(oidcUser) : null);
        }
      } catch (err) {
        console.error("[Auth] Error during init:", err);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();

    // Keep state in sync when the token renews automatically.
    const handleUserLoaded = (oidcUser: User) => {
      console.log("[Auth] Token renewed for:", oidcUser.profile.sub);
      setUser(toAuthUser(oidcUser));
    };
    const handleUserUnloaded = () => {
      console.log("[Auth] User unloaded");
      setUser(null);
    };

    userManager.events.addUserLoaded(handleUserLoaded);
    userManager.events.addUserUnloaded(handleUserUnloaded);

    return () => {
      cancelled = true;
      userManager.events.removeUserLoaded(handleUserLoaded);
      userManager.events.removeUserUnloaded(handleUserUnloaded);
    };
  }, [location.pathname, navigate]);

  const login = useCallback(async () => {
    await userManager.signinRedirect({ state: "/" });
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await userManager.signinRedirect({
      state: "/",
      // Keycloak recognises kc_idp_hint to skip the login chooser and go
      // straight to the Google IdP.
      extraQueryParams: { kc_idp_hint: "google" },
    });
  }, []);

  const logout = useCallback(async () => {
    await userManager.signoutRedirect();
  }, []);

  const getAccessToken = useCallback((): string | null => {
    return userRef.current?.accessToken ?? null;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, loginWithGoogle, logout, getAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Export the userManager for direct use in silent-renew page.
export { userManager };
