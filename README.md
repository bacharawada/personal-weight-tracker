# Weight Tracker

Interactive Dash web application for body weight tracking and analysis. Visualize your weight progression with rolling means, exponential-decay fitting, derivative analysis, and deviation detection — all backed by a SQLite database for persistent storage.

---

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Seed the database from the CSV (run once)
PYTHONPATH=src python src/db/migrate.py

# 3. Launch the app
PYTHONPATH=src python -m ui.layout
```

The app will be available at `http://localhost:8050`.

---

## Project Structure

```
src/
├── db/                          # Data storage & migration
│   ├── __init__.py              # Re-exports: WeightDataStore, get_engine, exceptions
│   ├── engine.py                # SQLAlchemy engine, table schema, domain exceptions
│   ├── store.py                 # WeightDataStore class (CRUD operations)
│   └── migrate.py               # One-time CSV -> SQLite seeding script
├── analysis/                    # Pure data science (no UI dependencies)
│   ├── __init__.py              # Re-exports all analysis functions
│   ├── smoothing.py             # Centred rolling mean
│   ├── derivative.py            # Time-based derivative (kg/week)
│   ├── curve_fit.py             # Exponential decay fit, extrapolation, deviations
│   └── stats.py                 # Summary KPI computation
├── viz/                         # Visualization layer
│   ├── __init__.py              # Re-exports figure builders and palettes
│   ├── palettes.py              # PaletteConfig dataclass + PALETTES registry
│   └── charts.py                # All Plotly figure-building functions (pure)
├── ui/                          # Dash application layer
│   ├── __init__.py              # Re-exports the app
│   ├── layout.py                # Dash app creation + full page layout
│   └── callbacks.py             # All Dash callbacks
└── __main__.py                  # Entry point for python -m
data/
├── weight_progression.csv       # Seed file (read-only after migration)
└── weight_tracker.db            # SQLite database (created on first run, gitignored)
tests/
├── conftest.py                  # Shared fixtures: in-memory SQLite engine, sample DataFrame
├── test_analysis.py             # Tests for analysis package
├── test_data.py                 # Tests for db package and migration
└── test_figures.py              # Tests for viz package
```

---

## Database Schema

**Table: `measurements`**

| Column   | Type    | Constraints                          |
|----------|---------|--------------------------------------|
| `id`     | INTEGER | PRIMARY KEY AUTOINCREMENT            |
| `date`   | DATE    | NOT NULL, UNIQUE                     |
| `weight` | REAL    | NOT NULL, CHECK (weight >= 40 AND weight <= 300) |

- **UNIQUE on `date`**: prevents duplicate measurements for the same day.
- **CHECK on `weight`**: enforces a physiologically valid range (40-300 kg).

---

## Manual Data Entry (SQL)

For power users who want to add data directly:

```sql
INSERT INTO measurements (date, weight) VALUES ('2026-05-01', 150.5);
```

---

## Export Database to CSV

```python
import pandas as pd
import sqlalchemy

pd.read_sql(
    "SELECT date, weight FROM measurements ORDER BY date",
    sqlalchemy.create_engine("sqlite:///data/weight_tracker.db")
).to_csv("export.csv", index=False)
```

---

## Running Tests

```bash
pytest --cov=src/db --cov=src/analysis --cov=src/viz tests/
```

Target: >= 80% coverage on `analysis/` and `db/`.

---

## Screenshots

*Screenshots will be added here after the first run of the application.*
