"""FastAPI application factory for the Weight Tracker API.

Creates the app, includes all route modules, and mounts the React
static build for production serving.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.deps import lifespan
from api.routes import charts, exports, imports, measurements, stats, users


def create_app() -> FastAPI:
    """Build and configure the FastAPI application.

    Returns:
        A fully configured ``FastAPI`` instance with all routes
        registered and CORS enabled.
    """
    app = FastAPI(
        title="Weight Tracker API",
        version="2.0.0",
        lifespan=lifespan,
    )

    # CORS origins from environment (comma-separated).
    # Falls back to the Vite dev server for local development.
    cors_origins_raw = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
    cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API routes.
    app.include_router(measurements.router, prefix="/api")
    app.include_router(charts.router, prefix="/api")
    app.include_router(exports.router, prefix="/api")
    app.include_router(imports.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(users.router, prefix="/api")

    # Serve React production build if the directory exists.
    frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    if frontend_dist.is_dir():
        app.mount(
            "/assets",
            StaticFiles(directory=str(frontend_dist / "assets")),
            name="assets",
        )

        @app.get("/{full_path:path}", include_in_schema=False)
        def serve_spa(full_path: str) -> FileResponse:
            """Serve index.html for any non-API path (SPA catch-all)."""
            return FileResponse(str(frontend_dist / "index.html"))

    return app
