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
# User profile
# ---------------------------------------------------------------------------


class UserProfileOut(BaseModel):
    """Response model for the current user's profile."""

    id: int
    keycloak_sub: str
    onboarding_completed: bool


# ---------------------------------------------------------------------------
# CSV import
# ---------------------------------------------------------------------------


class CsvPreviewRow(BaseModel):
    """A single parsed row in the CSV preview."""

    date: str          # ISO 8601 string — validated on confirm
    weight: float


class CsvPreviewOut(BaseModel):
    """Response from POST /api/imports/csv/preview.

    Returns the first rows of the parsed file plus metadata the frontend
    needs to let the user validate the detected date format.
    """

    rows: list[CsvPreviewRow]
    total_rows: int
    detected_date_format: str   # e.g. "%d/%m/%Y" or "%Y-%m-%d"
    date_format_example: str    # human-readable example from the data
    delimiter: str              # detected field delimiter
    skipped_rows: int           # rows that could not be parsed


class CsvConfirmIn(BaseModel):
    """Request body for POST /api/imports/csv/confirm.

    The frontend sends back the rows it wants to import (after the user
    has reviewed the preview) together with the confirmed date format.
    """

    rows: list[CsvPreviewRow]
    date_format: str            # confirmed by user (may differ from detected)


class CsvImportResult(BaseModel):
    """Response from POST /api/imports/csv/confirm."""

    inserted: int
    skipped_duplicates: int
    skipped_invalid: int


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class ErrorOut(BaseModel):
    """Standard error response body."""

    detail: str
