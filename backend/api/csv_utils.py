"""Shared CSV parsing helpers for the import endpoints.

The measurement and medication importers accept the same European-friendly
dialects — auto-detected field delimiter, comma-or-period decimals, and a
date format detected from the data itself — so that common parsing layer
lives here and each importer only declares the columns it needs.

Nothing in this module touches the database or FastAPI routing; it raises
``HTTPException`` only for input the user must fix.
"""

from __future__ import annotations

import io

import pandas as pd
from fastapi import HTTPException, UploadFile

# Maximum file size accepted (5 MB — far more than any real log).
MAX_BYTES = 5 * 1024 * 1024

# Candidate date formats tried in order. First match wins.
DATE_FORMATS = [
    "%Y-%m-%d",   # ISO 8601
    "%d/%m/%Y",   # European day-first
    "%m/%d/%Y",   # US month-first
    "%d-%m-%Y",
    "%m-%d-%Y",
    "%d.%m.%Y",
    "%Y/%m/%d",
]


def detect_delimiter(text: str) -> str:
    """Heuristically detect the CSV field delimiter.

    Counts occurrences of ';', ',', and '\t' in the first line and
    returns the most frequent one. Defaults to ',' if ambiguous.

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


def normalise_decimal(value: str) -> float | None:
    """Parse a number that may use a comma as decimal separator.

    Handles both ``83,5`` (European) and ``83.5`` (standard) forms, and
    strips thousands separators such as ``1.234,5``.

    Args:
        value: Raw string from the CSV cell.

    Returns:
        Float value, or ``None`` if the value cannot be parsed.
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


def detect_date_format(series: pd.Series) -> str | None:
    """Try each candidate date format and return the first that works.

    Args:
        series: Pandas Series of raw date strings.

    Returns:
        The matched strptime format string, or ``None``.
    """
    sample = series.dropna().head(5)
    for fmt in DATE_FORMATS:
        try:
            pd.to_datetime(sample, format=fmt, errors="raise")
            return fmt
        except (ValueError, TypeError):
            continue
    return None


def first_example(series: pd.Series) -> str:
    """Return the first raw date string as the human-readable example."""
    first = series.dropna().iloc[0] if not series.dropna().empty else ""
    return str(first)


def to_iso_date(raw: str, date_format: str) -> str | None:
    """Normalise a raw date string to ISO 8601 using *date_format*.

    Args:
        raw: Raw date cell content.
        date_format: strptime format returned by :func:`detect_date_format`.

    Returns:
        The ``YYYY-MM-DD`` string, or ``None`` if the value does not parse.
    """
    try:
        return pd.to_datetime(raw, format=date_format).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


async def read_upload(
    file: UploadFile,
    required_columns: tuple[str, ...],
) -> tuple[pd.DataFrame, str, str]:
    """Read an uploaded CSV and detect its dialect.

    Every cell is read as a string; callers parse the values themselves so
    each importer controls its own validation rules.

    Args:
        file: The uploaded CSV file.
        required_columns: Lower-case column names the file must contain.

    Returns:
        Tuple of ``(dataframe, delimiter, date_format)``. Column names are
        lower-cased and stripped.

    Raises:
        HTTPException 400: If the file is too large, unreadable, missing a
            required column, or its date column has no recognisable format.
    """
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    # Decode — try UTF-8 then latin-1 (common in European exports).
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    delimiter = detect_delimiter(text)

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

    missing = [c for c in required_columns if c not in df.columns]
    if missing:
        expected = ", ".join(f"'{c}'" for c in required_columns)
        raise HTTPException(
            status_code=400,
            detail=f"CSV must have {expected} columns. Found: {list(df.columns)}",
        )

    date_format = detect_date_format(df["date"])
    if date_format is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not detect the date format. "
                "Please ensure dates are in a standard format (e.g. YYYY-MM-DD, DD/MM/YYYY)."
            ),
        )

    return df, delimiter, date_format
