/**
 * Silent token renewal page — /auth/silent-renew
 *
 * Loaded in an invisible iframe by oidc-client-ts when it needs to
 * renew the access token without interrupting the user.
 * It must call signinSilentCallback() and nothing else.
 */

import { useEffect } from "react";
import { userManager } from "../context/AuthContext";

export function SilentRenewPage() {
  useEffect(() => {
    userManager.signinSilentCallback().catch(console.error);
  }, []);

  return null;
}
