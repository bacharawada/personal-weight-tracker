"""Entry point for running the Weight Tracker API server.

Usage::

    PYTHONPATH=src python -m api
    # or
    PYTHONPATH=src uvicorn api:create_app --factory --reload --port 8000
"""

from __future__ import annotations

import uvicorn

from api import create_app

app = create_app()

if __name__ == "__main__":
    uvicorn.run("api:create_app", factory=True, host="0.0.0.0", port=8000, reload=True)
