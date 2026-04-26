import pytest
import io
import os
import sys
from pathlib import Path
from typing import AsyncGenerator, Dict, Any

from httpx import AsyncClient
from fastapi.testclient import TestClient
from dotenv import load_dotenv
from unittest.mock import MagicMock

# Load .env explicitly
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# ── PATH CONFIGURATION ───────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Try importing the app, but provide a clear error if it fails
try:
    from main import app
except Exception as e:
    app = None
    IMPORT_ERROR = str(e)

from test_geo_validator import make_image_with_gps
from lib.sql_connect import engine

# ── TEST CLIENT SETUP ────────────────────────────────────────────────

@pytest.fixture
def client():
    """Synchronous test client for simple endpoint checks."""
    if app is None:
        pytest.skip(f"Skipping: Could not import FastAPI app: {IMPORT_ERROR}")
    return TestClient(app)

@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """Automatically mock the SQL engine for all tests in this module."""
    mock_conn = MagicMock()
    # Default behavior: return a mock user and mock skill
    mock_user = MagicMock(full_name="Test User", role="carpenter", current_district="Mysuru", cert_tier="beginner")
    mock_skill = MagicMock(skill_type="carpenter", proficiency_level="beginner")
    mock_conn.execute.return_value.fetchone.side_effect = [mock_user, mock_skill, mock_user, mock_skill, mock_user, mock_skill]
    
    mock_engine_connect = MagicMock(return_value=MagicMock(__enter__=MagicMock(return_value=mock_conn)))
    monkeypatch.setattr("router.verification.engine.connect", mock_engine_connect)
    return mock_conn

# ── HEALTH CHECK ─────────────────────────────────────────────────────

class TestHealthEndpoints:
    def test_health_endpoint_returns_ok(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

# ── FILE VALIDATION TESTS ─────────────────────────────────────────────

class TestFileValidation:
    def test_rejects_unsupported_file_type(self, client: TestClient):
        fake_pdf = io.BytesIO(b"%PDF-1.4 fake pdf content")
        response = client.post(
            "/api/verify/upload-work",
            data={"user_id": "test_user_001", "work_description": "Built a cabinet"},
            files={"file": ("document.pdf", fake_pdf, "application/pdf")}
        )
        assert response.status_code == 415
        assert "Unsupported file type" in response.json()["detail"]

    def test_rejects_oversized_image(self, client: TestClient):
        large_file = io.BytesIO(b"\x00" * (16 * 1024 * 1024))
        response = client.post(
            "/api/verify/upload-work",
            data={"user_id": "test_user_001", "work_description": "Test"},
            files={"file": ("big.jpg", large_file, "image/jpeg")}
        )
        assert response.status_code in (413, 422)

    def test_returns_404_for_nonexistent_user(self, client: TestClient, mock_db):
        """Mocks the SQL engine to return no user."""
        mock_db.execute.return_value.fetchone.side_effect = None
        mock_db.execute.return_value.fetchone.return_value = None

        img_bytes = make_image_with_gps(12.2958, 76.6394)
        response = client.post(
            "/api/verify/upload-work",
            data={"user_id": "non_existent_id", "work_description": "Built a shelf"},
            files={"file": ("work.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        )
        assert response.status_code == 404

# ── GEO VALIDATION INTEGRATION TESTS ────────────────────────────────

class TestGeoValidationIntegration:
    def test_location_mismatch_returns_422(self, client: TestClient):
        # Image with Delhi GPS coordinates (far from Mysuru)
        delhi_img = make_image_with_gps(28.6139, 77.2090)

        response = client.post(
            "/api/verify/upload-work",
            data={"user_id": "raju_001", "work_description": "Built furniture"},
            files={"file": ("work.jpg", io.BytesIO(delhi_img), "image/jpeg")}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "Location mismatch"

    def test_no_gps_image_records_with_warning(self, client: TestClient):
        from PIL import Image
        from lib.geo_validator import extract_gps_from_image, validate_location

        img = Image.new("RGB", (100, 100), color=(100, 60, 20))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        no_gps_bytes = buf.getvalue()

        result = extract_gps_from_image(no_gps_bytes)
        assert result is None

        geo_result = validate_location(None, "Mysuru")
        assert geo_result["valid"] is False
        assert geo_result["reason"] == "no_gps_data"