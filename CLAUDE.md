# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Interactive weight-tracking web app. FastAPI backend + React/TypeScript/Tailwind frontend, PostgreSQL (SQLite for tests), Keycloak for auth. Deployed to Azure Container Apps via Terraform + GitHub Actions OIDC.

## Common Commands

### Backend
```bash
# Run API server (requires DATABASE_URL in .env, Postgres running)
PYTHONPATH=backend uvicorn api:create_app --factory --reload --port 8000

# Run Alembic migrations
PYTHONPATH=backend alembic -c backend/alembic.ini upgrade head

# Generate a new migration after editing backend/db/engine.py schema
PYTHONPATH=backend alembic -c backend/alembic.ini revision --autogenerate -m "description"

# Tests — always uses in-memory SQLite via conftest.py (no live Postgres needed)
pytest                                                  # full suite
pytest backend/api/tests/test_api.py                    # single file
pytest backend/api/tests/test_api.py::test_function     # single test
pytest --cov=backend/db --cov=backend/analysis --cov=backend/viz --cov=backend/api backend/

# Lint
ruff check backend/
black backend/
```

### Frontend (`cd frontend`)
```bash
npm run dev      # Vite dev server on :5173 (proxies /api to :8000)
npm run build    # tsc -b && vite build → frontend/dist (served by FastAPI in prod)
npm run lint     # ESLint
```

### Full-stack dev (Linux/WSL only)
```bash
./dev.sh         # podman-compose (Postgres + Keycloak + pgweb) + alembic + overmind (api + frontend)
```
On Windows-without-WSL: run `./dev.sh` with `NO_FRONTEND=1` and launch `npm run dev` on the host.

### Docker Compose (alternative to dev.sh)
```bash
docker-compose up        # postgres, keycloak, pgweb, backend, frontend
```

## Architecture

### Backend layout (`backend/`)
Four packages with strict separation — `analysis/` and `viz/` are UI-agnostic and have **no FastAPI or DB imports**.

- **`db/`** — SQLAlchemy Core (not ORM). `engine.py` defines `metadata`, `users` and `measurements` tables, plus `DuplicateDateError` / `NotFoundError`. `store.py` exposes the `WeightDataStore` class — **all DB access must go through it**, never construct SQL elsewhere. `migrate.py` is a one-shot CSV seeder (not imported by the app).
- **`analysis/`** — pure data science (pandas/scipy/numpy). Smoothing, derivative, exponential-decay curve fit, summary stats. No side effects.
- **`viz/`** — Plotly figure builders. Functions take a DataFrame and return a `go.Figure`. `palettes.py` defines the `PaletteConfig` dataclass and the `PALETTES` registry.
- **`api/`** — FastAPI app factory in `api/__init__.py`. Routes split per concern under `api/routes/` (measurements, charts, exports, imports, stats, users). `api/deps.py` owns the singleton `WeightDataStore` via lifespan. `api/auth.py` validates Keycloak JWTs against the JWKS (cached 5 min).

The app factory also mounts `frontend/dist` and serves it as an SPA when the directory exists — production runs a single container; dev runs Vite + FastAPI separately.

### Data model
`measurements` rows are scoped per user via FK to `users.id`. The `users` table stores only `keycloak_sub` (UUID) and an `onboarding_completed` flag — **no PII (email/name) is duplicated from Keycloak**. Constraints: `weight BETWEEN 40 AND 300`, `UNIQUE(user_id, date)`.

### Authentication flow
Frontend uses `oidc-client-ts` (Authorization Code + PKCE) against Keycloak. Backend extracts the `sub` claim via `api.auth.get_current_user`, then `WeightDataStore.get_or_create_user(sub)` resolves it to the internal `user_id`. Tests override `get_current_user` via `app.dependency_overrides`.

### Frontend (`frontend/src/`)
React 19 + Vite + Tailwind. shadcn/ui primitives in `components/ui` (CVA variants, no external `className` override on primitives). Global state in `context/AuthContext.tsx` and `context/WeightTrackerContext.tsx`. Plotly is lazy-loaded via `lib/PlotlyFactory.ts`. API client in `lib/api.ts`; types in `lib/types.ts`.

### Tests
All backend tests use the in-memory SQLite engine from `backend/conftest.py`. The `store` fixture seeds 10 measurements for `TEST_USER_SUB`. **Never touch the real database in tests.** The SQLite schema mirrors Postgres; alembic migrations are not run in tests (the conftest calls `metadata.create_all` directly).

## Deployment

Three independent GitHub Actions workflows in `.github/workflows/`, all using Azure OIDC (no long-lived secrets):
- **`infra.yml`** — Terraform apply (`infra/` → resource group, ACR, Container App, storage, IAM)
- **`db.yml`** — runs Alembic migrations against the Azure Postgres
- **`app.yml`** — runs pytest, then builds the backend image, pushes to ACR, updates the Container App revision

The frontend is built into `frontend/dist` and copied into the backend image (single container deploy).

## Conventions specific to this repo

- **Type hints on every Python function signature.** `from __future__ import annotations` at the top of each file.
- **Google-style docstrings** on every public function/class/method, with `Args:` / `Returns:` / `Raises:` where applicable.
- **Never let SQLAlchemy exceptions reach callers** — `IntegrityError` → `DuplicateDateError`, missing row → `NotFoundError`.
- **`api/routes/` modules never construct SQL** — go through `WeightDataStore`.
- **Curve-fit failures must degrade gracefully** — show raw data, surface a warning in the UI, never crash.
- **CORS origins** come from the `CORS_ORIGINS` env var (comma-separated); default is the Vite dev URL.
- **`DATABASE_URL`** is required for the app to start (no SQLite fallback in production code — only in tests).
- **Alembic autogenerate** off `backend/db/engine.py` metadata — keep schema edits there, then generate a revision.

## What NOT to touch without explicit instruction

- `backend/db/engine.py` schema (requires a paired Alembic migration)
- Existing Alembic migrations in `backend/alembic/versions/`
- `infra/*.tf` (Azure resource naming follows Microsoft CAF — `ca-baw-weighttracker-prd` etc.)
- `docker/keycloak/realm-export.json` (auto-imported on first Keycloak boot)
- `.env` (secrets — `.env.example` and `.env.production.example` document the contract)
