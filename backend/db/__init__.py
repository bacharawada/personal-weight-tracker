"""Database package — SQLAlchemy Core schema, engine, store, and migration.

Public API re-exported here for convenient imports::

    from db import WeightDataStore, get_engine, metadata, measurements, users
    from db import DuplicateDateError, NotFoundError
"""

from __future__ import annotations

from db.engine import (
    DuplicateDateError,
    NotFoundError,
    get_engine,
    measurements,
    metadata,
    users,
)
from db.store import WeightDataStore

__all__ = [
    "DuplicateDateError",
    "NotFoundError",
    "WeightDataStore",
    "get_engine",
    "measurements",
    "metadata",
    "users",
]
