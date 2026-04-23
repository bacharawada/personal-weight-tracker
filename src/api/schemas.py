"""Pydantic models for request and response validation.

All API input/output is validated through these schemas so that the
route handlers stay thin and type-safe.
"""

from __future__ import annotations

import datetime  # noqa: TC003 — Pydantic needs this at runtime for field validation

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Measurements
# ---------------------------------------------------------------------------


class MeasurementIn(BaseModel):
    """Request body for adding a new measurement."""

    date: datetime.date = Field(..., description="Measurement date (ISO 8601)")
    weight: float = Field(
        ..., ge=40.0, le=300.0, description="Body weight in kg (40-300)"
    )


class MeasurementOut(BaseModel):
    """Response model for a single measurement."""

    date: datetime.date
    weight: float


class MeasurementUpdate(BaseModel):
    """Request body for updating an existing measurement's weight."""

    weight: float = Field(
        ..., ge=40.0, le=300.0, description="New body weight in kg (40-300)"
    )


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


class StatsOut(BaseModel):
    """Response model for summary KPIs."""

    total_loss_kg: float
    avg_loss_per_week: float
    current_trend: float
    days_tracked: int
    measurement_count: int


# ---------------------------------------------------------------------------
# Palettes
# ---------------------------------------------------------------------------


class PaletteOut(BaseModel):
    """Response model for palette metadata."""

    names: list[str]


# ---------------------------------------------------------------------------
# DB polling
# ---------------------------------------------------------------------------


class MtimeOut(BaseModel):
    """Response model for database modification time."""

    mtime: float


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class ErrorOut(BaseModel):
    """Standard error response body."""

    detail: str
