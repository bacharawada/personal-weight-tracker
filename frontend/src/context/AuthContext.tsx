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

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Keep a ref to the latest user for synchronous getAccessToken().
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Register the token getter once so lib/api.ts can attach Bearer tokens.
  useEffect(() => {
    setTokenGetter(() => userRef.current?.accessToken ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // If this is the OIDC redirect callback, finish the sign-in.
        if (window.location.pathname === "/auth/callback") {
          const oidcUser = await userManager.signinRedirectCallback();
          if (!cancelled) {
            setUser(toAuthUser(oidcUser));
            // Navigate away from the callback URL to the original destination.
            const returnTo = oidcUser.state as string | undefined;
            window.history.replaceState({}, "", returnTo ?? "/");
          }
          return;
        }

        // Try to load an existing session.
        const oidcUser = await userManager.getUser();
        if (!cancelled) {
          setUser(oidcUser && !oidcUser.expired ? toAuthUser(oidcUser) : null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();

    // Keep state in sync when the token renews automatically.
    const handleUserLoaded = (oidcUser: User) => {
      setUser(toAuthUser(oidcUser));
    };
    const handleUserUnloaded = () => setUser(null);

    userManager.events.addUserLoaded(handleUserLoaded);
    userManager.events.addUserUnloaded(handleUserUnloaded);

    return () => {
      cancelled = true;
      userManager.events.removeUserLoaded(handleUserLoaded);
      userManager.events.removeUserUnloaded(handleUserUnloaded);
    };
  }, []);

  const login = useCallback(async () => {
    // Preserve the current path so we can return after login.
    await userManager.signinRedirect({
      state: window.location.pathname + window.location.search,
    });
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await userManager.signinRedirect({
      state: window.location.pathname + window.location.search,
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
