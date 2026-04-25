import pytest
from lib.geo_validator import (
    extract_gps_from_image,
    extract_gps_from_video,
    validate_location,
    reverse_geocode,
    geocode_city,
    _parse_iso6709,
    _dms_to_decimal
)
from PIL import Image
import io
import piexif
import os


# ── HELPER: build a fake JPEG with injected GPS coordinates ──────────

def make_image_with_gps(lat: float, lng: float) -> bytes:
    """
    Creates a minimal JPEG in memory with EXIF GPS data injected.
    Use this instead of needing a real smartphone photo for most tests.
    """

    def to_dms_rational(value: float):
        """Converts decimal degrees to DMS IFDRational tuples."""
        value    = abs(value)
        degrees  = int(value)
        minutes  = int((value - degrees) * 60)
        seconds  = round(((value - degrees) * 60 - minutes) * 60 * 10000)
        return [
            (degrees, 1),
            (minutes, 1),
            (seconds, 10000)
        ]

    img = Image.new("RGB", (100, 100), color=(120, 80, 40))

    exif_dict = {
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef:  b"N" if lat >= 0 else b"S",
            piexif.GPSIFD.GPSLatitude:     to_dms_rational(lat),
            piexif.GPSIFD.GPSLongitudeRef: b"E" if lng >= 0 else b"W",
            piexif.GPSIFD.GPSLongitude:    to_dms_rational(lng),
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
        lat, lng   = 12.2958, 76.6394   # Mysuru city centre
        img_bytes  = make_image_with_gps(lat, lng)
        result     = extract_gps_from_image(img_bytes)

        assert result is not None, "Should extract GPS from EXIF"
        assert abs(result["lat"] - lat) < 0.001, f"Lat mismatch: {result['lat']} vs {lat}"
        assert abs(result["lng"] - lng) < 0.001, f"Lng mismatch: {result['lng']} vs {lng}"
        assert result["source"] in ("pillow_exif", "exifread")

    def test_returns_none_for_image_without_gps(self):
        """
        An image with no EXIF GPS should return None, not crash.
        """
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
        not os.path.exists("tests/assets/real_carpentry.jpg"),
        reason="Real photo not provided — skipping"
    )
    def test_extracts_gps_from_real_smartphone_photo(self):
        """
        Tests against an actual smartphone photo with GPS EXIF.
        Add a real photo to tests/assets/real_carpentry.jpg to run this.
        GPS will vary — just check that something is returned.
        """
        with open("tests/assets/real_carpentry.jpg", "rb") as f:
            img_bytes = f.read()
        result = extract_gps_from_image(img_bytes)
        print(f"\nReal photo GPS: {result}")
        # Don't assert specific coordinates — just that extraction worked
        # Comment out the assert below if the real photo has no GPS
        assert result is not None, (
            "Real photo returned no GPS. "
            "Check if your camera has location tagging enabled."
        )


class TestISO6709Parsing:
    """Tests for the video GPS string parser."""

    def test_parses_bengaluru_coords(self):
        result = _parse_iso6709("+12.9716+077.5946+920.000/")
        assert result is not None
        assert abs(result["lat"] - 12.9716)  < 0.0001
        assert abs(result["lng"] - 77.5946)  < 0.0001
        assert abs(result["altitude"] - 920.0) < 0.1

    def test_parses_without_altitude(self):
        result = _parse_iso6709("+15.3173+075.7139/")
        assert result is not None
        assert result["altitude"] is None

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
        """
        Carpenter registered in Mysuru, work done in Mysuru city.
        Should pass easily.
        """
        mysuru_gps = {"lat": 12.2958, "lng": 76.6394}
        result     = validate_location(mysuru_gps, "Mysuru")

        assert result["valid"] is True
        assert result["distance_km"] < 5

    def test_mandya_work_for_mysuru_resident_passes(self):
        """
        Mysuru carpenter working in Mandya (60km away).
        Should pass — within 100km radius.
        """
        mandya_gps = {"lat": 12.5218, "lng": 76.8951}
        result     = validate_location(mandya_gps, "Mysuru")

        assert result["valid"] is True
        assert result["distance_km"] < 100
        print(f"\nMysuru → Mandya: {result['distance_km']} km")

    def test_bengaluru_work_for_mysuru_resident_fails(self):
        """
        Mysuru carpenter submitting work supposedly from Bengaluru (140km).
        Should fail — outside 100km radius.
        """
        bengaluru_gps = {"lat": 12.9716, "lng": 77.5946}
        result        = validate_location(bengaluru_gps, "Mysuru")

        assert result["valid"] is False
        assert result["distance_km"] > 100
        assert result["reason"] == "too_far"
        print(f"\nMysuru → Bengaluru: {result['distance_km']} km")

    def test_no_gps_returns_invalid_with_correct_reason(self):
        """
        When GPS is None (no metadata in file), should return
        valid=False with reason='no_gps_data', not crash.
        """
        result = validate_location(None, "Dharwad")

        assert result["valid"] is False
        assert result["reason"] == "no_gps_data"
        assert result["distance_km"] is None

    def test_custom_radius_respected(self):
        """
        If we set max_radius_km=50, Mandya work from Mysuru (60km) should fail.
        """
        mandya_gps = {"lat": 12.5218, "lng": 76.8951}
        result     = validate_location(mandya_gps, "Mysuru", max_radius_km=50.0)
        assert result["valid"] is False

    def test_delhi_work_for_karnataka_resident_fails(self):
        """
        GPS coordinates from Delhi should obviously fail for any Karnataka user.
        """
        delhi_gps = {"lat": 28.6139, "lng": 77.2090}
        result    = validate_location(delhi_gps, "Belagavi")
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
        print(f"\nReverse geocode of Mysuru Palace: {result}")