"""Pydantic models for request and response validation.

All API input/output is validated through these schemas so that the
route handlers stay thin and type-safe.
"""

from __future__ import annotations

import datetime  # noqa: TC003 — Pydantic needs this at runtime for field validation
from typing import Literal

from pydantic import BaseModel, Field, field_validator

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
# Medication doses
# ---------------------------------------------------------------------------


class MedicationDoseIn(BaseModel):
    """Request body for logging a new medication dose."""

    date: datetime.date = Field(..., description="Dose date (ISO 8601)")
    medication: str = Field(
        ..., min_length=1, max_length=100, description="Molecule name (free text)"
    )
    dose_mg: float | None = Field(
        default=None, gt=0, description="Dose in milligrams (> 0 when given)"
    )
    note: str | None = Field(default=None, max_length=300)

    @field_validator("medication")
    @classmethod
    def _strip_medication(cls, value: str) -> str:
        """Trim surrounding whitespace and reject an empty molecule name."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("medication must not be blank")
        return stripped

    @field_validator("note")
    @classmethod
    def _normalise_note(cls, value: str | None) -> str | None:
        """Trim the note and collapse an empty string to ``None``."""
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class MedicationDoseOut(BaseModel):
    """Response model for a single medication dose."""

    id: int
    date: datetime.date
    medication: str
    dose_mg: float | None
    note: str | None


class DoseImpactOut(BaseModel):
    """Response model for one dose-change impact row (/api/medications/impact).

    Slopes are in kg/week and negative when losing weight. A ``None`` slope
    means that side of the window had too few measurements to fit; the
    frontend degrades gracefully in that case.
    """

    date: datetime.date
    medication: str
    dose_mg: float | None
    previous_dose_mg: float | None
    is_first: bool
    slope_before_per_week: float | None
    slope_after_per_week: float | None
    n_before: int
    n_after: int
    delta_per_week: float | None
    window_days: int
    reason: str


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
    latest_weight: float | None


# ---------------------------------------------------------------------------
# Goal projection
# ---------------------------------------------------------------------------


class GoalProjectionOut(BaseModel):
    """Response model for the goal projection (/api/goal)."""

    has_goal: bool
    reachable: bool | None
    predicted_date: datetime.date | None
    predicted_date_optimistic: datetime.date | None
    predicted_date_pessimistic: datetime.date | None
    days_remaining: int | None
    already_reached: bool
    on_track: bool | None
    days_ahead_behind: int | None
    trend_per_week: float | None
    reason: str


# ---------------------------------------------------------------------------
# Charts — raw data series (rendering happens entirely on the frontend)
# ---------------------------------------------------------------------------


class ChartPoint(BaseModel):
    """A single ``(date, value)`` point in a chart series."""

    date: datetime.date
    value: float


class ChartBandPoint(BaseModel):
    """A single point of an uncertainty band (``date`` with low/high edges)."""

    date: datetime.date
    lower: float
    upper: float


class ModelDiagnosticsOut(BaseModel):
    """Fitted-parameter diagnostics for one prediction model.

    Weights are in kg, rates in kg/week. Fields that do not apply to the
    model kind are ``None`` (e.g. ``half_life_days`` for the linear trend).
    Consumed by the frontend's methodology explainers and stat cards.
    """

    n_points: int
    residual_std: float
    a: float | None = None
    b: float | None = None
    c: float | None = None
    a_std: float | None = None
    b_std: float | None = None
    c_std: float | None = None
    half_life_days: float | None = None
    current_rate_per_week: float | None = None
    slope_per_week: float | None = None
    slope_low_per_week: float | None = None
    slope_high_per_week: float | None = None
    window_days: int | None = None
    used_fallback: bool | None = None


class ModelSeriesOut(BaseModel):
    """One prediction model's drawable series for the weight chart."""

    id: Literal["exp", "linear"]
    label: str
    fit: list[ChartPoint]
    projection: list[ChartPoint]
    band: list[ChartBandPoint]
    asymptote: float | None
    asymptote_label: str
    warning: str
    diagnostics: ModelDiagnosticsOut | None = None


class DeviationZoneOut(BaseModel):
    """A shaded plateau / acceleration zone derived from exp-fit residuals."""

    start: datetime.date
    end: datetime.date
    kind: Literal["plateau", "acceleration"]


class WeightChartData(BaseModel):
    """Response model for GET /api/charts/weight."""

    raw: list[ChartPoint]
    smoothed: list[ChartPoint]
    smoothing_window: int
    models: list[ModelSeriesOut]
    zones: list[DeviationZoneOut]
    goal_weight: float | None


class RatePoint(BaseModel):
    """A single ``(date, rate)`` point for the rate-of-change chart."""

    date: datetime.date
    rate: float


class DerivativeChartData(BaseModel):
    """Response model for GET /api/charts/derivative."""

    bars: list[RatePoint]
    smoothed: list[ChartPoint]


class ResidualSeriesOut(BaseModel):
    """One model's residual series (observed minus predicted)."""

    id: Literal["exp", "linear"]
    label: str
    points: list[ChartPoint]


class ResidualsChartData(BaseModel):
    """Response model for GET /api/charts/residuals."""

    series: list[ResidualSeriesOut]
    sigma: float


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
    height_cm: float | None
    goal_weight: float | None
    target_date: datetime.date | None
    unit_preference: Literal["kg", "lb"]


class UserProfileUpdate(BaseModel):
    """Request body for PATCH /api/me — all fields optional (partial update).

    Fields omitted from the request are left unchanged; sending an explicit
    ``null`` clears the corresponding value.
    """

    height_cm: float | None = Field(default=None, ge=50.0, le=300.0)
    goal_weight: float | None = Field(default=None, ge=40.0, le=300.0)
    target_date: datetime.date | None = None
    unit_preference: Literal["kg", "lb"] | None = None


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
