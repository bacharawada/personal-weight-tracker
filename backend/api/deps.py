"""FastAPI dependency injection and application lifespan management.

Provides a shared ``WeightDataStore`` instance and engine that persist
for the lifetime of the application.  The lifespan context manager
ensures the database tables exist on startup.

Authentication dependency (``get_current_user``) is defined here as a
stub for Phase 1.  Phase 2 will replace it with real Keycloak JWT
validation.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from db import WeightDataStore, get_engine, metadata

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

    from fastapi import FastAPI

# ---------------------------------------------------------------------------
# Module-level singletons (initialised during lifespan startup)
# ---------------------------------------------------------------------------

_engine = None
_store: WeightDataStore | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: create engine and ensure schema on startup.

    If ``_store`` is already set (e.g. by test fixtures), the lifespan
    skips initialisation to avoid overwriting the test database.

    Args:
        app: The FastAPI application instance.

    Yields:
        Control back to the framework after startup is complete.
    """
    global _engine, _store  # noqa: PLW0603
    if _store is None:
        _engine = get_engine()
        # create_all is idempotent and safe to run on every startup.
        # In production with Alembic we rely on migrations; this call
        # ensures the schema exists in dev/test without running alembic.
        metadata.create_all(_engine, checkfirst=True)
        _store = WeightDataStore(_engine)
    yield


def get_store() -> WeightDataStore:
    """Return the shared ``WeightDataStore`` instance.

    Returns:
        The application-wide data store.

    Raises:
        RuntimeError: If called before the application lifespan has started.
    """
    if _store is None:
        raise RuntimeError("Store not initialised — app lifespan has not started")
    return _store


# ---------------------------------------------------------------------------
# Authentication dependency
# ---------------------------------------------------------------------------
# Re-exported from api.auth so that tests can override via:
#   app.dependency_overrides[api_deps.get_current_user] = lambda: "test-sub"
# ---------------------------------------------------------------------------

from api.auth import get_current_user as get_current_user  # noqa: F401, E402
