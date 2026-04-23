"""UI package — Dash application layout and callbacks.

Re-exports the app and register_callbacks for the entry point::

    from ui import app
"""

from __future__ import annotations

from ui.layout import app

__all__ = ["app"]
