import pytest
import io
import os
from pathlib import Path
from typing import Dict, Any, Optional

from PIL import Image
import piexif

from lib.geo_validator import (
    extract_gps_from_image,
    extract_gps_from_video,
    validate_location,
    reverse_geocode,
    geocode_city,
    _parse_iso6709,
    _dms_to_decimal
)

@pytest.fixture(autouse=True)
def mock_geocoding(monkeypatch):
    """Mocks geocode_city to return fixed coordinates for test cities."""
    city_map = {
        "Mysuru": {"lat": 12.2958, "lng": 76.6394},
        "Mandya": {"lat": 12.5218, "lng": 76.8951},
        "Bengaluru": {"lat": 12.9716, "lng": 77.5946},
        "Belagavi": {"lat": 15.8497, "lng": 74.4977},
        "Mysuru, Karnataka": {"lat": 12.2958, "lng": 76.6394},
        "Dharwad": {"lat": 15.4589, "lng": 75.0078}
    }
    def fake_geocode(city):
        return city_map.get(city)
    
    # Mock where it is defined
    monkeypatch.setattr("lib.geo_validator.geocode_city", fake_geocode)
    # Mock where it is imported in the current test module
    monkeypatch.setattr(f"{__name__}.geocode_city", fake_geocode)

# ── CONFIGURATION & ASSETS ───────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
REAL_PHOTO_PATH = ASSETS_DIR / "real_carpentry.jpg"

# ── HELPER: build a fake JPEG with injected GPS coordinates ──────────

def make_image_with_gps(lat: float, lng: float) -> bytes:
    """
    Creates a minimal JPEG in memory with EXIF GPS data injected.
    Use this instead of needing a real smartphone photo for most tests.
    """

    def to_dms_rational(value: float):
        """Converts decimal degrees to DMS IFDRational tuples."""
        value = abs(value)
        degrees = int(value)
        minutes = int((value - degrees) * 60)
        seconds = round(((value - degrees) * 60 - minutes) * 60 * 10000)
        return [
            (degrees, 1),
            (minutes, 1),
            (seconds, 10000)
        ]

    img = Image.new("RGB", (100, 100), color=(120, 80, 40))

    exif_dict = {
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef: b"N" if lat >= 0 else b"S",
            piexif.GPSIFD.GPSLatitude: to_dms_rational(lat),
            piexif.GPSIFD.GPSLongitudeRef: b"E" if lng >= 0 else b"W",
            piexif.GPSIFD.GPSLongitude: to_dms_rational(lng),
        }
    }

    exif_bytes = piexif.dump(exif_dict)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif_bytes)
    return buf.getvalue()


# ── GPS EXTRACTION TESTS ─────────────────────────────────────────────

class TestGPSExtraction:

    def test_extracts_gps_from_synthetic_image(self):
        """
        Core test: inject known GPS into a JPEG and confirm extraction
        returns coordinates within 0.001 degrees of what we put in.
        """
        lat, lng = 12.2958, 76.6394   # Mysuru city centre
        img_bytes = make_image_with_gps(lat, lng)
        result = extract_gps_from_image(img_bytes)

        assert result is not None, "Should extract GPS from EXIF"
        assert abs(result["lat"] - lat) < 0.001, f"Lat mismatch: {result['lat']} vs {lat}"
        assert abs(result["lng"] - lng) < 0.001, f"Lng mismatch: {result['lng']} vs {lng}"
        assert result["source"] in ("pillow_exif", "exifread")

    def test_returns_none_for_image_without_gps(self):
        """An image with no EXIF GPS should return None, not crash."""
        img = Image.new("RGB", (100, 100), color=(0, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        result = extract_gps_from_image(buf.getvalue())
        assert result is None

    def test_returns_none_for_corrupted_bytes(self):
        """Should not raise an exception for garbage input."""
        result = extract_gps_from_image(b"this is not an image at all")
        assert result is None

    def test_returns_none_for_empty_bytes(self):
        result = extract_gps_from_image(b"")
        assert result is None

    @pytest.mark.skipif(
        not REAL_PHOTO_PATH.exists(),
        reason=f"Real photo not found at {REAL_PHOTO_PATH}"
    )
    def test_extracts_gps_from_real_smartphone_photo(self):
        """
        Tests against an actual smartphone photo with GPS EXIF.
        """
        img_bytes = REAL_PHOTO_PATH.read_bytes()
        result = extract_gps_from_image(img_bytes)
        print(f"\n[DEBUG] Real photo GPS: {result}")
        assert result is not None, (
            "Real photo returned no GPS. Check if camera location tagging is enabled."
        )


class TestISO6709Parsing:
    """Tests for the video GPS string parser."""

    def test_parses_bengaluru_coords(self):
        result = _parse_iso6709("+12.9716+077.5946+920.000/")
        assert result is not None
        assert abs(result["lat"] - 12.9716) < 0.0001
        assert abs(result["lng"] - 77.5946) < 0.0001
        assert abs(result["altitude"] - 920.0) < 0.1

    def test_parses_without_altitude(self):
        result = _parse_iso6709("+15.3173+075.7139/")
        assert result is not None
        assert result.get("altitude") is None

    def test_returns_none_for_garbage_string(self):
        assert _parse_iso6709("no coordinates here") is None

    def test_returns_none_for_empty_string(self):
        assert _parse_iso6709("") is None

    def test_handles_southern_hemisphere_coordinates(self):
        # Test with negative lat (south) — edge case
        result = _parse_iso6709("-12.9716+077.5946/")
        assert result is not None
        assert result["lat"] < 0


# ── VALIDATION TESTS ─────────────────────────────────────────────────

class TestLocationValidation:

    def test_mysuru_work_for_mysuru_resident_passes(self):
        """Carpenter registered in Mysuru, work done in Mysuru city."""
        mysuru_gps = {"lat": 12.2958, "lng": 76.6394}
        result = validate_location(mysuru_gps, "Mysuru")

        assert result["valid"] is True
        assert result["distance_km"] < 5

    def test_mandya_work_for_mysuru_resident_passes(self):
        """Mysuru carpenter working in Mandya (60km away). Passes within 100km."""
        mandya_gps = {"lat": 12.5218, "lng": 76.8951}
        result = validate_location(mandya_gps, "Mysuru")

        assert result["valid"] is True
        assert result["distance_km"] < 100
        print(f"\n[DEBUG] Mysuru -> Mandya: {result['distance_km']:.2f} km")

    def test_bengaluru_work_for_mysuru_resident_fails(self):
        """Mysuru carpenter submitting work from Bengaluru (140km). Fails."""
        bengaluru_gps = {"lat": 12.9716, "lng": 77.5946}
        result = validate_location(bengaluru_gps, "Mysuru")

        assert result["valid"] is False
        assert result["distance_km"] > 100
        assert result["reason"] == "too_far"

    def test_no_gps_returns_invalid_with_correct_reason(self):
        """Handles missing GPS metadata gracefully."""
        result = validate_location(None, "Dharwad")

        assert result["valid"] is False
        assert result["reason"] == "no_gps_data"
        assert result.get("distance_km") is None

    def test_custom_radius_respected(self):
        """
        If we set max_radius_km=50, Chamarajanagar work from Mysuru (~52km) should fail.
        """
        # Chamarajanagar coordinates
        chamarajanagar_gps = {"lat": 11.9261, "lng": 76.9437}
        result = validate_location(chamarajanagar_gps, "Mysuru", max_radius_km=50.0)
        assert result["valid"] is False
        assert result["distance_km"] > 50

    def test_delhi_work_for_karnataka_resident_fails(self):
        """Extreme distance check."""
        delhi_gps = {"lat": 28.6139, "lng": 77.2090}
        result = validate_location(delhi_gps, "Belagavi")
        assert result["valid"] is False
        assert result["distance_km"] > 1000


# ── GEOCODING TESTS ──────────────────────────────────────────────────

class TestGeocoding:

    def test_geocodes_mysuru(self):
        result = geocode_city("Mysuru")
        assert result is not None
        # Mysuru is around 12.29°N, 76.63°E
        assert 11.5 < result["lat"] < 13.0
        assert 75.5 < result["lng"] < 77.5

    def test_geocodes_dharwad(self):
        result = geocode_city("Dharwad")
        assert result is not None

    def test_returns_none_for_made_up_city(self):
        result = geocode_city("XyzzyFakeCityName12345")
        assert result is None

    def test_reverse_geocode_mysuru_coordinates(self):
        # Mysuru Palace coordinates
        result = reverse_geocode(12.3052, 76.6552)
        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 0
        print(f"\n[DEBUG] Reverse geocode of Mysuru Palace: {result}")