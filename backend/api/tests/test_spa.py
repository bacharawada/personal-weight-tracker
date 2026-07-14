"""Tests for the SPA catch-all route (``serve_spa`` in ``api``).

Builds the real app via ``create_app`` pointed at a fake ``frontend/dist``
directory so root-level static files (sw.js, manifest.webmanifest, ...)
can be exercised without a real frontend build.

The ``TestClient`` is used without entering its context manager, so the
app lifespan (and therefore the database) is never touched.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from fastapi.testclient import TestClient

from api import create_app

if TYPE_CHECKING:
    from pathlib import Path

INDEX_HTML = "<html><body>spa-index</body></html>"
SW_JS = "self.addEventListener('fetch', () => {});"
MANIFEST = '{"name": "Weight Tracker"}'
SECRET = "outside-dist-secret"


@pytest.fixture
def spa_client(tmp_path: Path) -> TestClient:
    """TestClient wired to a fake ``frontend/dist`` under ``tmp_path``.

    Creates a minimal dist layout (index.html, sw.js,
    manifest.webmanifest, empty assets/) plus a ``secret.txt`` *outside*
    the dist directory to verify the path-traversal guard.

    Returns:
        A ``TestClient`` instance.
    """
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(INDEX_HTML)
    (dist / "sw.js").write_text(SW_JS)
    (dist / "manifest.webmanifest").write_text(MANIFEST)
    (tmp_path / "secret.txt").write_text(SECRET)
    return TestClient(create_app(frontend_dist=dist))


class TestServeSpa:
    def test_root_serves_index(self, spa_client: TestClient) -> None:
        """GET / returns index.html as text/html."""
        resp = spa_client.get("/")
        assert resp.status_code == 200
        assert resp.text == INDEX_HTML
        assert "text/html" in resp.headers["content-type"]

    def test_real_file_served_with_own_content(
        self, spa_client: TestClient
    ) -> None:
        """A root-level dist file is served as-is, not replaced by index.html."""
        resp = spa_client.get("/sw.js")
        assert resp.status_code == 200
        assert resp.text == SW_JS
        # Service worker registration requires a JavaScript MIME type.
        assert "javascript" in resp.headers["content-type"]

    def test_manifest_served_with_own_content(
        self, spa_client: TestClient
    ) -> None:
        """The PWA manifest must not come back as HTML."""
        resp = spa_client.get("/manifest.webmanifest")
        assert resp.status_code == 200
        assert resp.text == MANIFEST
        assert "text/html" not in resp.headers["content-type"]

    def test_unknown_path_falls_back_to_index(
        self, spa_client: TestClient
    ) -> None:
        """Client-side routes (no file on disk) still get index.html."""
        resp = spa_client.get("/analysis")
        assert resp.status_code == 200
        assert resp.text == INDEX_HTML
        assert "text/html" in resp.headers["content-type"]

    def test_nested_unknown_path_falls_back_to_index(
        self, spa_client: TestClient
    ) -> None:
        """Nested client-side routes also get index.html."""
        resp = spa_client.get("/settings/profile")
        assert resp.status_code == 200
        assert resp.text == INDEX_HTML

    def test_path_traversal_is_rejected(self, spa_client: TestClient) -> None:
        """An encoded ``..`` segment must not escape the dist directory."""
        # %2e%2e decodes to ".." after routing; httpx would normalise a
        # literal "/../" away before the request ever reaches the app.
        resp = spa_client.get("/%2e%2e/secret.txt")
        assert resp.status_code == 200
        assert SECRET not in resp.text
        assert resp.text == INDEX_HTML
