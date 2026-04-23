"""One-time CSV to SQLite migration script.

Reads ``data/weight_progression.csv``, validates and deduplicates rows,
then seeds the ``measurements`` table in the SQLite database.  This
script is **idempotent**: running it multiple times will not create
duplicate rows thanks to ``INSERT OR IGNORE`` semantics.

Usage::

    python backend/db/migrate.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import sqlalchemy as sa

from db.engine import get_engine, metadata

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CSV_PATH = Path("data") / "weight_progression.csv"


def run_migration(csv_path: Path | None = None, engine: sa.engine.Engine | None = None) -> dict[str, int]:
    """Execute the CSV-to-SQLite migration.

    Args:
        csv_path: Path to the seed CSV file.  Defaults to
            ``data/weight_progression.csv``.
        engine: SQLAlchemy engine.  When ``None`` a default engine
            pointing to ``data/weight_tracker.db`` is created.

    Returns:
        A dict with keys ``rows_read``, ``rows_inserted``, and
        ``rows_skipped``.

    Raises:
        FileNotFoundError: If *csv_path* does not exist.
        ValueError: If the CSV contains unparseable dates or weights
            outside the valid range.
    """
    if csv_path is None:
        csv_path = CSV_PATH
    if engine is None:
        engine = get_engine()

    # --- 1. Read CSV -------------------------------------------------------
    if not csv_path.exists():
        raise FileNotFoundError(f"Seed file not found: {csv_path}")

    df = pd.read_csv(csv_path, parse_dates=["date"])
    rows_read = len(df)

    # --- 2. Validate -------------------------------------------------------
    if df["date"].isna().any():
        raise ValueError("CSV contains unparseable dates")

    bad_weights = df[(df["weight"] < 40) | (df["weight"] > 300)]
    if not bad_weights.empty:
        raise ValueError(
            f"CSV contains weights outside valid range (40-300 kg): "
            f"{bad_weights['weight'].tolist()}"
        )

    # --- 3. Aggregate same-day duplicates by mean --------------------------
    df = df.groupby("date", as_index=False)["weight"].mean()
    df = df.sort_values("date").reset_index(drop=True)

    # --- 4. Ensure table exists --------------------------------------------
    metadata.create_all(engine, checkfirst=True)

    # --- 5. Insert with INSERT OR IGNORE -----------------------------------
    rows_inserted = 0
    with engine.begin() as conn:
        for _, row in df.iterrows():
            stmt = sa.text(
                "INSERT OR IGNORE INTO measurements (date, weight) "
                "VALUES (:date, :weight)"
            )
            result = conn.execute(
                stmt,
                {"date": row["date"].date().isoformat(), "weight": float(row["weight"])},
            )
            rows_inserted += result.rowcount

    rows_skipped = len(df) - rows_inserted
    return {
        "rows_read": rows_read,
        "rows_inserted": rows_inserted,
        "rows_skipped": rows_skipped,
    }


def main() -> None:
    """Entry point for the migration script."""
    print("Weight Tracker — CSV to SQLite Migration")
    print("=" * 42)

    try:
        summary = run_migration()
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"  Rows read from CSV : {summary['rows_read']}")
    print(f"  Rows inserted      : {summary['rows_inserted']}")
    print(f"  Rows skipped (dup) : {summary['rows_skipped']}")
    print("Done.")


if __name__ == "__main__":
    main()
