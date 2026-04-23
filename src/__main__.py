"""Allow running the application with ``python -m ui.layout`` from src/."""

from __future__ import annotations

from ui.layout import app

if __name__ == "__main__":
    app.run(debug=True, port=8050)
