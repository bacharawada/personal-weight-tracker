"""CSV import endpoints.

Two-step flow, identical for measurements and medication doses:
  1. POST …/csv/preview  — parse the uploaded file, detect delimiter and
     date format, return the parsed rows for user review.
  2. POST …/csv/confirm  — receive the (possibly corrected) rows back from
     the frontend and persist them to the database.

CSV expectations (European-friendly defaults) are shared by both importers
and implemented in ``api.csv_utils``:
  - Header row required; column names are matched case-insensitively.
  - Decimal separator is a comma (e.g. 83,5) OR a period.
  - Field delimiter is auto-detected (comma, semicolon, tab).
  - Date format is auto-detected from the first non-empty value and shown
    to the user for confirmation before any data is saved.

Columns per dataset:
  - measurements: ``date``, ``weight``
  - medications:  ``date``, ``medication`` (+ optional ``dose_mg``/``dose``
    and ``note``)
"""

from __future__ import annotations

import datetime

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile

from api.csv_utils import (
    first_example,
    normalise_decimal,
    read_upload,
    to_iso_date,
)
from api.deps import get_current_user, get_store
from api.schemas import (
    CsvConfirmIn,
    CsvImportResult,
    CsvPreviewOut,
    CsvPreviewRow,
    MedicationCsvConfirmIn,
    MedicationCsvPreviewOut,
    MedicationCsvPreviewRow,
)
from db import DuplicateDateError, WeightDataStore

router = APIRouter(prefix="/imports", tags=["imports"])

# Bounds enforced by the database schema, applied here so a bad row is
# reported as skipped instead of blowing up the insert.
_WEIGHT_MIN = 40.0
_WEIGHT_MAX = 300.0
_MEDICATION_MAX_LENGTH = 100
_NOTE_MAX_LENGTH = 300
# dose_mg is NUMERIC(7, 3) — three decimals, below 10000.
_DOSE_MAX = 9999.999
_DOSE_DECIMALS = 3


def _cell(row: pd.Series, column: str) -> str:
    """Return a stripped cell value, or an empty string when absent/NaN."""
    if column not in row:
        return ""
    value = row[column]
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def _dose_key(date: str, medication: str, dose_mg: float | None) -> tuple:
    """Identity used to recognise a dose already present in the journal.

    Medication doses have no uniqueness constraint (logging two molecules on
    the same day is legitimate), so re-importing a file would otherwise
    duplicate every row. Matching on date + molecule + amount keeps an import
    idempotent without forbidding same-day doses. The amount is rounded to
    the column's precision so a stored value and its CSV round-trip compare
    equal.
    """
    amount = None if dose_mg is None else round(dose_mg, _DOSE_DECIMALS)
    return (date, medication.casefold(), amount)


# ---------------------------------------------------------------------------
# Measurements
# ---------------------------------------------------------------------------


@router.post("/csv/preview", response_model=CsvPreviewOut)
async def preview_csv(
    file: UploadFile,
    _sub: str = Depends(get_current_user),
) -> CsvPreviewOut:
    """Parse an uploaded measurements CSV and return a preview for review.

    The file is NOT saved at this step — only parsed and returned.

    Args:
        file: The uploaded CSV file.
        _sub: Auth dependency (validates token; user identity not needed here).

    Returns:
        Parsed preview rows and detected format metadata.

    Raises:
        HTTPException 400: If the file is too large, unreadable, missing the
            expected columns, or holds no valid row.
    """
    df, delimiter, date_format = await read_upload(file, ("date", "weight"))

    rows: list[CsvPreviewRow] = []
    skipped = 0

    for _, row in df.iterrows():
        weight = normalise_decimal(_cell(row, "weight"))
        if weight is None or not (_WEIGHT_MIN <= weight <= _WEIGHT_MAX):
            skipped += 1
            continue

        iso_date = to_iso_date(_cell(row, "date"), date_format)
        if iso_date is None:
            skipped += 1
            continue

        rows.append(CsvPreviewRow(date=iso_date, weight=weight))

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No valid rows found in the CSV after parsing.",
        )

    return CsvPreviewOut(
        rows=rows,           # all valid rows — confirm step needs the full set
        total_rows=len(rows),
        detected_date_format=date_format,
        date_format_example=first_example(df["date"]),
        delimiter=delimiter,
        skipped_rows=skipped,
    )


@router.post("/csv/confirm", response_model=CsvImportResult)
def confirm_csv_import(
    body: CsvConfirmIn,
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> CsvImportResult:
    """Persist the confirmed measurement rows to the database.

    The frontend sends back the rows (potentially trimmed or reordered
    after user review) and the confirmed date format.

    Args:
        body: Confirmed rows + date format.
        keycloak_sub: Authenticated user identity.
        store: Injected data store.

    Returns:
        Summary of inserted / skipped rows.
    """
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

        if not (_WEIGHT_MIN <= row.weight <= _WEIGHT_MAX):
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


# ---------------------------------------------------------------------------
# Medication doses
# ---------------------------------------------------------------------------


@router.post("/medications/csv/preview", response_model=MedicationCsvPreviewOut)
async def preview_medications_csv(
    file: UploadFile,
    _sub: str = Depends(get_current_user),
) -> MedicationCsvPreviewOut:
    """Parse an uploaded medication CSV and return a preview for review.

    ``dose_mg`` (also accepted as ``dose``) and ``note`` are optional: a
    blank cell yields ``None``. A dose that is present but unparsable or out
    of range invalidates the row rather than being silently dropped, since
    the amount is the point of logging it. Over-long notes are truncated.

    Args:
        file: The uploaded CSV file.
        _sub: Auth dependency (validates token; user identity not needed here).

    Returns:
        Parsed preview rows and detected format metadata.

    Raises:
        HTTPException 400: If the file is too large, unreadable, missing the
            expected columns, or holds no valid row.
    """
    df, delimiter, date_format = await read_upload(file, ("date", "medication"))

    # Accept the export's own header (`dose_mg`) as well as a plain `dose`.
    dose_column = "dose_mg" if "dose_mg" in df.columns else "dose"

    rows: list[MedicationCsvPreviewRow] = []
    skipped = 0

    for _, row in df.iterrows():
        medication = _cell(row, "medication")
        if not medication or len(medication) > _MEDICATION_MAX_LENGTH:
            skipped += 1
            continue

        iso_date = to_iso_date(_cell(row, "date"), date_format)
        if iso_date is None:
            skipped += 1
            continue

        raw_dose = _cell(row, dose_column)
        dose_mg: float | None = None
        if raw_dose:
            parsed = normalise_decimal(raw_dose)
            if parsed is None or not (0 < parsed <= _DOSE_MAX):
                skipped += 1
                continue
            dose_mg = round(parsed, _DOSE_DECIMALS)

        note = _cell(row, "note")[:_NOTE_MAX_LENGTH] or None

        rows.append(
            MedicationCsvPreviewRow(
                date=iso_date,
                medication=medication,
                dose_mg=dose_mg,
                note=note,
            )
        )

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No valid rows found in the CSV after parsing.",
        )

    return MedicationCsvPreviewOut(
        rows=rows,
        total_rows=len(rows),
        detected_date_format=date_format,
        date_format_example=first_example(df["date"]),
        delimiter=delimiter,
        skipped_rows=skipped,
    )


@router.post("/medications/csv/confirm", response_model=CsvImportResult)
def confirm_medications_csv_import(
    body: MedicationCsvConfirmIn,
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> CsvImportResult:
    """Persist the confirmed medication rows to the database.

    Rows matching an existing dose on date + molecule + amount are counted as
    duplicates and skipped, so importing the same file twice is a no-op.
    Duplicates inside the payload itself are collapsed the same way.

    Args:
        body: Confirmed rows + date format.
        keycloak_sub: Authenticated user identity.
        store: Injected data store.

    Returns:
        Summary of inserted / skipped rows.
    """
    known = {
        _dose_key(
            dose["date"].isoformat(),
            dose["medication"],
            dose["dose_mg"],
        )
        for dose in store.list_doses(keycloak_sub)
    }

    inserted = 0
    skipped_duplicates = 0
    skipped_invalid = 0

    for row in body.rows:
        try:
            date = datetime.date.fromisoformat(row.date)
        except ValueError:
            skipped_invalid += 1
            continue

        medication = row.medication.strip()
        if not medication or len(medication) > _MEDICATION_MAX_LENGTH:
            skipped_invalid += 1
            continue

        if row.dose_mg is not None and not (0 < row.dose_mg <= _DOSE_MAX):
            skipped_invalid += 1
            continue

        dose_mg = None if row.dose_mg is None else round(row.dose_mg, _DOSE_DECIMALS)
        key = _dose_key(row.date, medication, dose_mg)
        if key in known:
            skipped_duplicates += 1
            continue

        note = (row.note or "").strip()[:_NOTE_MAX_LENGTH] or None
        store.add_dose(keycloak_sub, date, medication, dose_mg, note)
        known.add(key)
        inserted += 1

    return CsvImportResult(
        inserted=inserted,
        skipped_duplicates=skipped_duplicates,
        skipped_invalid=skipped_invalid,
    )
