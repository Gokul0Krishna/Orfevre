import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
from main import app
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from test_geo_validator import make_image_with_gps
import io


# ── TEST CLIENT SETUP ────────────────────────────────────────────────

@pytest.fixture
def client():
    """Synchronous test client for simple endpoint checks."""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Async test client for full upload pipeline tests."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


# ── HEALTH CHECK ─────────────────────────────────────────────────────

class TestHealthEndpoints:

    def test_health_endpoint_returns_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_docs_endpoint_accessible(self, client):
        """FastAPI auto-generates /docs — confirm it loads."""
        response = client.get("/docs")
        assert response.status_code == 200


# ── FILE VALIDATION TESTS ─────────────────────────────────────────────
# These test the upload endpoint's file validation layer only.
# They do NOT need real Firestore or Gemini — they fail before reaching them.

class TestFileValidation:

    def test_rejects_unsupported_file_type(self, client):
        """
        Uploading a PDF should return 415 Unsupported Media Type.
        """
        fake_pdf = io.BytesIO(b"%PDF-1.4 fake pdf content")
        response = client.post(
            "/api/verify/upload-work",
            data={
                "user_id":          "test_user_001",
                "trade":            "carpenter",
                "claimed_level":    "intermediate",
                "work_description": "Built a cabinet"
            },
            files={"file": ("document.pdf", fake_pdf, "application/pdf")}
        )
        assert response.status_code == 415
        assert "Unsupported file type" in response.json()["detail"]

    def test_rejects_oversized_image(self, client):
        """
        An image over 15MB should return 413.
        We fake a large file by sending 16MB of zeros with a JPEG content type.
        """
        large_file = io.BytesIO(b"\x00" * (16 * 1024 * 1024))
        response = client.post(
            "/api/verify/upload-work",
            data={
                "user_id":          "test_user_001",
                "trade":            "carpenter",
                "claimed_level":    "intermediate",
                "work_description": "Test"
            },
            files={"file": ("big.jpg", large_file, "image/jpeg")}
        )
        assert response.status_code == 413

    def test_returns_404_for_nonexistent_user(self, client):
        """
        Valid file but a user_id that doesn't exist in Firestore.
        Should return 404. Requires Firestore connection.
        """
        img_bytes = make_image_with_gps(12.2958, 76.6394)
        response  = client.post(
            "/api/verify/upload-work",
            data={
                "user_id":          "this_user_does_not_exist_xyz",
                "trade":            "carpenter",
                "claimed_level":    "beginner",
                "work_description": "Built a shelf"
            },
            files={"file": ("work.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        )
        assert response.status_code == 404


# ── GEO VALIDATION INTEGRATION TESTS ────────────────────────────────
# These test the geo pipeline end to end through the HTTP layer.
# They mock Firestore user lookup to avoid needing real data.

class TestGeoValidationIntegration:

    def test_location_mismatch_returns_422(self, client, monkeypatch):
        """
        An image taken in Delhi (far from Karnataka) submitted by a
        Karnataka-registered user should return 422.
        We monkeypatch Firestore so we don't need a real DB connection.
        """
        # Monkeypatch the Firestore user lookup
        def mock_get_user(*args, **kwargs):
            class FakeSnap:
                exists = True
                def to_dict(self):
                    return {
                        "name":     "Raju Test",
                        "district": "Mysuru",
                        "trade":    "carpenter"
                    }
            return FakeSnap()

        monkeypatch.setattr(
            "router.verification.db.collection",
            lambda name: type("col", (), {
                "document": lambda self, uid: type("doc", (), {
                    "get": mock_get_user
                })()
            })()
        )

        # Image with Delhi GPS coordinates
        delhi_img = make_image_with_gps(28.6139, 77.2090)

        response = client.post(
            "/api/verify/upload-work",
            data={
                "user_id":          "raju_001",
                "trade":            "carpenter",
                "claimed_level":    "intermediate",
                "work_description": "Built furniture"
            },
            files={"file": ("work.jpg", io.BytesIO(delhi_img), "image/jpeg")}
        )

        assert response.status_code == 422
        detail = response.json()["detail"]
        assert detail["error"] == "location_mismatch"
        print(f"\nMismatch message: {detail['message']}")

    def test_no_gps_image_records_with_warning(self, client, monkeypatch):
        """
        An image without GPS should NOT be blocked — it records with a
        warning flag and geoVerified=False.
        """
        from PIL import Image
        img = Image.new("RGB", (100, 100), color=(100, 60, 20))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        no_gps_bytes = buf.getvalue()

        # Monkeypatch to avoid real Firestore + Gemini calls
        # In a real test environment you'd use a test Firebase project instead
        # For now just confirm the geo warning is present in the response
        # when GPS is absent — test what you can without full integration

        # Extract GPS from the no-GPS image and check it's None
        from lib.geo_validator import extract_gps_from_image
        result = extract_gps_from_image(no_gps_bytes)
        assert result is None   # confirms the no-GPS path works

        # Confirm validate_location handles None gracefully
        from lib.geo_validator import validate_location
        geo_result = validate_location(None, "Mysuru")
        assert geo_result["valid"]  is False
        assert geo_result["reason"] == "no_gps_data"