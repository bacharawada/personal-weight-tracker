"""CSV to PostgreSQL migration / seed script.

Reads a CSV file with ``date`` and ``weight`` columns, validates and
deduplicates rows, then seeds the ``measurements`` table for a specific
user.  This script is **idempotent**: running it multiple times will not
create duplicate rows.

Usage (one-off seed for the dev stub user)::

    DATABASE_URL=postgresql+psycopg2://... python backend/db/migrate.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import sqlalchemy as sa

from db.engine import get_engine, measurements, metadata
from db.store import WeightDataStore

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CSV_PATH = Path("data") / "weight_progression.csv"
# Default user for the one-off CLI migration (matches the Phase 1 stub).
DEFAULT_KEYCLOAK_SUB = "dev-stub-user"


def run_migration(
    csv_path: Path | None = None,
    engine: sa.engine.Engine | None = None,
    keycloak_sub: str = DEFAULT_KEYCLOAK_SUB,
) -> dict[str, int]:
    """Execute the CSV-to-database migration for *keycloak_sub*.

    Args:
        csv_path: Path to the seed CSV file.  Defaults to
            ``data/weight_progression.csv``.
        engine: SQLAlchemy engine.  When ``None`` a default engine is
            created from the ``DATABASE_URL`` environment variable.
        keycloak_sub: Keycloak subject to own the imported measurements.

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

    # --- 4. Ensure table exists and resolve user ---------------------------
    metadata.create_all(engine, checkfirst=True)
    store = WeightDataStore(engine)
    user_id = store.get_or_create_user(keycloak_sub)

    # --- 5. Insert (skip existing date+user combinations) ------------------
    # Fetch the dates already stored for this user to avoid integrity errors.
    rows_inserted = 0
    rows_skipped = 0

    with engine.connect() as conn:
        existing_dates = {
            row[0]
            for row in conn.execute(
                sa.select(measurements.c.date).where(
                    measurements.c.user_id == user_id
                )
            ).fetchall()
        }

    with engine.begin() as conn:
        for _, row in df.iterrows():
            date_val = row["date"].date()
            if date_val in existing_dates:
                rows_skipped += 1
                continue
            conn.execute(
                measurements.insert().values(
                    user_id=user_id,
                    date=date_val,
                    weight=float(row["weight"]),
                )
            )
            rows_inserted += 1

    return {
        "rows_read": rows_read,
        "rows_inserted": rows_inserted,
        "rows_skipped": rows_skipped,
    }


def main() -> None:
    """Entry point for the migration script."""
    print("Weight Tracker — CSV Migration")
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
