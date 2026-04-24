"""CSV import endpoints.

Two-step flow:
  1. POST /api/imports/csv/preview  — parse the uploaded file, detect
     delimiter and date format, return the first rows for user review.
  2. POST /api/imports/csv/confirm  — receive the (possibly corrected)
     rows back from the frontend and persist them to the database.

CSV expectations (European-friendly defaults):
  - Two columns: date and weight (header row required).
  - Decimal separator for weight is a comma (e.g. 83,5) OR a period.
  - Field delimiter is auto-detected (comma, semicolon, tab).
  - Date format is auto-detected from the first non-empty value and shown
    to the user for confirmation before any data is saved.
"""

from __future__ import annotations

import io
import re
from typing import TYPE_CHECKING

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile

from api.deps import get_current_user, get_store
from api.schemas import (
    CsvConfirmIn,
    CsvImportResult,
    CsvPreviewOut,
    CsvPreviewRow,
)
from db import DuplicateDateError, WeightDataStore

if TYPE_CHECKING:
    pass

router = APIRouter(prefix="/imports", tags=["imports"])

# Maximum file size accepted (5 MB — far more than any real weight log).
_MAX_BYTES = 5 * 1024 * 1024

# Number of preview rows sent back to the frontend.
_PREVIEW_ROWS = 10

# Candidate date formats tried in order.  First match wins.
_DATE_FORMATS = [
    "%Y-%m-%d",   # ISO 8601
    "%d/%m/%Y",   # European day-first
    "%m/%d/%Y",   # US month-first
    "%d-%m-%Y",
    "%m-%d-%Y",
    "%d.%m.%Y",
    "%Y/%m/%d",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _detect_delimiter(text: str) -> str:
    """Heuristically detect the CSV field delimiter.

    Counts occurrences of ';', ',', and '\t' in the first line and
    returns the most frequent one.  Defaults to ',' if ambiguous.

    Args:
        text: Raw CSV text content.

    Returns:
        One of ``','``, ``';'``, or ``'\\t'``.
    """
    first_line = text.split("\n")[0]
    counts = {
        ";": first_line.count(";"),
        ",": first_line.count(","),
        "\t": first_line.count("\t"),
    }
    # Prefer semicolon if it's present (European CSV with comma decimals)
    if counts[";"] > 0:
        return ";"
    best = max(counts, key=lambda k: counts[k])
    return best if counts[best] > 0 else ","


def _normalise_weight(value: str) -> float | None:
    """Parse a weight string that may use comma as decimal separator.

    Handles both ``83,5`` (European) and ``83.5`` (standard) forms.

    Args:
        value: Raw string from the CSV cell.

    Returns:
        Float weight, or ``None`` if the value cannot be parsed.
    """
    cleaned = value.strip().replace(",", ".")
    # Remove anything that looks like a thousands separator (e.g. 1.234,5)
    # after we've already swapped comma→period: detect multiple periods.
    parts = cleaned.split(".")
    if len(parts) > 2:
        # Assume last part is the decimal, others are thousands separators.
        cleaned = "".join(parts[:-1]) + "." + parts[-1]
    try:
        return float(cleaned)
    except ValueError:
        return None


def _detect_date_format(series: pd.Series) -> str | None:
    """Try each candidate date format and return the first that works.

    Args:
        series: Pandas Series of raw date strings.

    Returns:
        The matched strptime format string, or ``None``.
    """
    sample = series.dropna().head(5)
    for fmt in _DATE_FORMATS:
        try:
            pd.to_datetime(sample, format=fmt, errors="raise")
            return fmt
        except (ValueError, TypeError):
            continue
    return None


def _fmt_to_example(fmt: str, series: pd.Series) -> str:
    """Return the first raw date string as the human-readable example."""
    first = series.dropna().iloc[0] if not series.dropna().empty else ""
    return str(first)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/csv/preview", response_model=CsvPreviewOut)
async def preview_csv(
    file: UploadFile,
    _sub: str = Depends(get_current_user),
) -> CsvPreviewOut:
    """Parse an uploaded CSV and return a preview for user review.

    The file is NOT saved at this step — only parsed and returned.

    Args:
        file: The uploaded CSV file.
        _sub: Auth dependency (validates token; user identity not needed here).

    Returns:
        Parsed preview rows, detected format metadata.

    Raises:
        HTTPException 400: If the file is too large, unreadable, or missing
            the expected columns.
    """
    raw = await file.read()
    if len(raw) > _MAX_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    # Decode — try UTF-8 then latin-1 (common in European exports).
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    delimiter = _detect_delimiter(text)

    try:
        df = pd.read_csv(
            io.StringIO(text),
            sep=delimiter,
            dtype=str,       # read everything as strings; we parse manually
            skipinitialspace=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}") from exc

    # Normalise column names: lowercase + strip whitespace.
    df.columns = [c.strip().lower() for c in df.columns]

    if "date" not in df.columns or "weight" not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=(
                f"CSV must have 'date' and 'weight' columns. "
                f"Found: {list(df.columns)}"
            ),
        )

    date_fmt = _detect_date_format(df["date"])
    if date_fmt is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not detect the date format. "
                "Please ensure dates are in a standard format (e.g. YYYY-MM-DD, DD/MM/YYYY)."
            ),
        )

    # Parse rows, collecting valid ones and counting skipped.
    rows: list[CsvPreviewRow] = []
    skipped = 0

    for _, row in df.iterrows():
        raw_date = str(row["date"]).strip()
        raw_weight = str(row["weight"]).strip()

        weight = _normalise_weight(raw_weight)
        if weight is None or not (40 <= weight <= 300):
            skipped += 1
            continue

        # Normalise date to ISO 8601 using detected format.
        try:
            parsed_date = pd.to_datetime(raw_date, format=date_fmt)
            iso_date = parsed_date.strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            skipped += 1
            continue

        rows.append(CsvPreviewRow(date=iso_date, weight=weight))

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No valid rows found in the CSV after parsing.",
        )

    return CsvPreviewOut(
        rows=rows[:_PREVIEW_ROWS],
        total_rows=len(rows),
        detected_date_format=date_fmt,
        date_format_example=_fmt_to_example(date_fmt, df["date"]),
        delimiter=delimiter,
        skipped_rows=skipped,
    )


@router.post("/csv/confirm", response_model=CsvImportResult)
def confirm_csv_import(
    body: CsvConfirmIn,
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> CsvImportResult:
    """Persist the confirmed rows to the database.

    The frontend sends back the rows (potentially trimmed or reordered
    after user review) and the confirmed date format.

    Args:
        body: Confirmed rows + date format.
        keycloak_sub: Authenticated user identity.
        store: Injected data store.

    Returns:
        Summary of inserted / skipped rows.
    """
    import datetime

    inserted = 0
    skipped_duplicates = 0
    skipped_invalid = 0

    for row in body.rows:
        # Re-parse the ISO date (already normalised by preview step).
        try:
            date = datetime.date.fromisoformat(row.date)
        except ValueError:
            skipped_invalid += 1
            continue

        if not (40 <= row.weight <= 300):
            skipped_invalid += 1
            continue

        try:
            store.add(keycloak_sub, date, row.weight)
            inserted += 1
        except DuplicateDateError:
            skipped_duplicates += 1

    return CsvImportResult(
        inserted=inserted,
        skipped_duplicates=skipped_duplicates,
        skipped_invalid=skipped_invalid,
    )
