# Weight Tracker

Interactive web application for body weight tracking and analysis. React + TypeScript + Tailwind CSS frontend with a FastAPI backend. Visualize your weight progression with rolling means, exponential-decay fitting, derivative analysis, and deviation detection — all backed by a SQLite database.

---

## Setup

### Backend

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Seed the database from the CSV (run once)
PYTHONPATH=src python src/db/migrate.py

# 3. Start the API server
PYTHONPATH=src uvicorn api:create_app --factory --reload --port 8000
```

### Frontend

```bash
# 1. Install Node dependencies
cd frontend && npm install

# 2a. Development (with hot reload, proxies /api to port 8000)
npm run dev

# 2b. Production build (served by FastAPI at /)
npm run build
```

**Development:** Run both the API server (port 8000) and Vite dev server (port 5173). Open `http://localhost:5173`.

**Production:** Build the frontend, then run only the API server. Open `http://localhost:8000`.

---

## Project Structure

```
src/
├── db/                          # Data storage & migration
│   ├── engine.py                # SQLAlchemy engine, table schema, domain exceptions
│   ├── store.py                 # WeightDataStore class (CRUD operations)
│   └── migrate.py               # One-time CSV -> SQLite seeding script
├── analysis/                    # Pure data science (no UI dependencies)
│   ├── smoothing.py             # Centred rolling mean
│   ├── derivative.py            # Time-based derivative (kg/week)
│   ├── curve_fit.py             # Exponential decay fit, extrapolation, deviations
│   └── stats.py                 # Summary KPI computation
├── viz/                         # Visualization layer
│   ├── palettes.py              # PaletteConfig dataclass + PALETTES registry
│   └── charts.py                # Plotly figure-building functions (pure)
├── api/                         # FastAPI REST API
│   ├── __init__.py              # App factory (create_app)
│   ├── deps.py                  # Dependency injection (engine, store)
│   ├── schemas.py               # Pydantic request/response models
│   └── routes/
│       ├── measurements.py      # CRUD + palettes + db-mtime
│       ├── charts.py            # Plotly figure JSON endpoints
│       ├── exports.py           # PNG and CSV downloads
│       └── stats.py             # Summary KPI endpoint
└── __main__.py                  # Uvicorn entry point
frontend/
├── src/
│   ├── components/
│   │   ├── layout/              # Navbar, StatsCards, Sidebar
│   │   ├── charts/              # WeightChart, DerivativeChart, ResidualsChart
│   │   └── forms/               # AddMeasurement, DeletePoint
│   ├── hooks/                   # useTheme, usePolling
│   ├── lib/                     # api.ts, types.ts, cn.ts
│   ├── App.tsx                  # Root layout
│   └── main.tsx                 # Vite entry point
├── package.json
├── vite.config.ts
└── tsconfig.json
data/
├── weight_progression.csv       # Seed file (read-only after migration)
└── weight_tracker.db            # SQLite database (gitignored)
tests/
├── conftest.py                  # Shared fixtures (in-memory SQLite)
├── test_analysis.py             # Analysis package tests
├── test_data.py                 # DB package + migration tests
├── test_figures.py              # Viz package tests
└── test_api.py                  # API endpoint tests
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/measurements` | List all measurements |
| POST | `/api/measurements` | Add a measurement `{date, weight}` |
| DELETE | `/api/measurements/{date}` | Delete a measurement |
| GET | `/api/stats` | Summary KPIs |
| GET | `/api/charts/weight` | Weight chart (Plotly JSON) |
| GET | `/api/charts/derivative` | Derivative chart (Plotly JSON) |
| GET | `/api/charts/residuals` | Residuals chart (Plotly JSON) |
| GET | `/api/exports/png` | Weight chart as PNG |
| GET | `/api/exports/csv` | All measurements as CSV |
| GET | `/api/palettes` | Available colour palette names |
| GET | `/api/db-mtime` | Database file modification time |

---

## Database Schema

**Table: `measurements`**

| Column   | Type    | Constraints                          |
|----------|---------|--------------------------------------|
| `id`     | INTEGER | PRIMARY KEY AUTOINCREMENT            |
| `date`   | DATE    | NOT NULL, UNIQUE                     |
| `weight` | REAL    | NOT NULL, CHECK (weight >= 40 AND weight <= 300) |

---

## Running Tests

```bash
pytest --cov=src/db --cov=src/analysis --cov=src/viz --cov=src/api tests/
```

---

## Screenshots

*Screenshots will be added here after the first run of the application.*
