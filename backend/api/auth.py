"""Keycloak JWT authentication for FastAPI.

Validates Bearer tokens issued by the configured Keycloak realm and
extracts the ``sub`` claim (user identity).

The JWKS (public key set) is fetched from Keycloak's well-known endpoint
and cached in memory with a TTL so key rotations are picked up without
a restart.

Environment variables consumed:
    KEYCLOAK_URL    Base URL of Keycloak (e.g. http://localhost:8080)
    KEYCLOAK_REALM  Realm name           (e.g. weight-tracker)
    KEYCLOAK_CLIENT_ID  Client ID        (e.g. weight-tracker-frontend)
"""

from __future__ import annotations

import os
import time

import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_KEYCLOAK_URL = os.environ.get("KEYCLOAK_URL", "http://localhost:8080")
_KEYCLOAK_REALM = os.environ.get("KEYCLOAK_REALM", "weight-tracker")
_KEYCLOAK_CLIENT_ID = os.environ.get("KEYCLOAK_CLIENT_ID", "weight-tracker-frontend")

_JWKS_URL = f"{_KEYCLOAK_URL}/realms/{_KEYCLOAK_REALM}/protocol/openid-connect/certs"
_ISSUER = f"{_KEYCLOAK_URL}/realms/{_KEYCLOAK_REALM}"

# JWKS cache: (keys_list, fetched_at_epoch)
_jwks_cache: tuple[list[dict], float] | None = None
_JWKS_TTL_SECONDS = 300  # Re-fetch public keys every 5 minutes

# FastAPI bearer scheme — auto-documents the security requirement.
_bearer_scheme = HTTPBearer(auto_error=True)


# ---------------------------------------------------------------------------
# JWKS helpers
# ---------------------------------------------------------------------------


def _get_jwks() -> list[dict]:
    """Return cached JWKS keys, refreshing if the TTL has expired."""
    global _jwks_cache  # noqa: PLW0603

    now = time.monotonic()
    if _jwks_cache is not None:
        keys, fetched_at = _jwks_cache
        if now - fetched_at < _JWKS_TTL_SECONDS:
            return keys

    try:
        response = httpx.get(_JWKS_URL, timeout=5)
        response.raise_for_status()
        keys = response.json().get("keys", [])
    except Exception as exc:
        # If Keycloak is unreachable and we have a cached value, use it.
        if _jwks_cache is not None:
            return _jwks_cache[0]
        raise HTTPException(
            status_code=503,
            detail="Authentication service unavailable — could not fetch public keys",
        ) from exc

    _jwks_cache = (keys, now)
    return keys


# ---------------------------------------------------------------------------
# Token validation
# ---------------------------------------------------------------------------


def _validate_token(token: str) -> str:
    """Validate a Keycloak JWT and return the ``sub`` claim.

    Args:
        token: Raw JWT string from the Authorization header.

    Returns:
        The ``sub`` claim string (Keycloak user UUID).

    Raises:
        HTTPException 401: If the token is missing, expired, or invalid.
    """
    keys = _get_jwks()

    # Decode header without verification to find the key ID.
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token header") from exc

    kid = unverified_header.get("kid")
    matching_keys = [k for k in keys if k.get("kid") == kid] if kid else keys

    if not matching_keys:
        # kid not found — force a JWKS refresh and retry once.
        global _jwks_cache  # noqa: PLW0603
        _jwks_cache = None
        matching_keys = _get_jwks()
        if kid:
            matching_keys = [k for k in matching_keys if k.get("kid") == kid]

    last_exc: Exception | None = None
    for key in matching_keys:
        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                issuer=_ISSUER,
                # Keycloak access tokens set `aud` to "account" (the account
                # service), not to the client ID.  The client ID appears in
                # the `azp` (authorized party) claim instead.  We verify the
                # issuer and signature which is sufficient; additionally check
                # `azp` matches our client ID below.
                options={"verify_aud": False},
            )
            # Verify authorized party matches our client.
            azp = payload.get("azp")
            if azp and azp != _KEYCLOAK_CLIENT_ID:
                raise JWTError(
                    f"Token azp '{azp}' does not match client '{_KEYCLOAK_CLIENT_ID}'"
                )
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(status_code=401, detail="Token missing sub claim")
            return str(sub)
        except ExpiredSignatureError as exc:
            raise HTTPException(status_code=401, detail="Token has expired") from exc
        except JWTError as exc:
            last_exc = exc
            continue

    raise HTTPException(
        status_code=401,
        detail=f"Token validation failed: {last_exc}",
    ) from last_exc


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
) -> str:
    """FastAPI dependency: validate Bearer JWT and return the Keycloak ``sub``.

    Args:
        credentials: Injected by FastAPI's HTTPBearer scheme.

    Returns:
        Keycloak subject string (UUID).

    Raises:
        HTTPException 401: On any authentication failure.
    """
    return _validate_token(credentials.credentials)
