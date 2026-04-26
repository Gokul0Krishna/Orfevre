from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import subprocess
import json
import exifread
import struct
import io
import os
from typing import Optional

geolocator = Nominatim(user_agent="gramsphere-verifier")


# ── COORDINATE EXTRACTION ────────────────────────────────────────────


def extract_gps_from_image(file_bytes: bytes) -> Optional[dict]:
    """
    Extract GPS coordinates from image EXIF data.
    Tries Pillow first, falls back to exifread.
    Returns { lat, lng, altitude, timestamp } or None.
    """

    # ── Attempt 1: Pillow ──────────────────────────────────────────
    try:
        img       = Image.open(io.BytesIO(file_bytes))
        exif_raw  = img._getexif()

        if exif_raw:
            # Map numeric EXIF tags to human-readable names
            exif_named = {TAGS.get(k, k): v for k, v in exif_raw.items()}

            if "GPSInfo" in exif_named:
                gps_raw = {
                    GPSTAGS.get(k, k): v
                    for k, v in exif_named["GPSInfo"].items()
                }

                lat = _dms_to_decimal(
                    gps_raw.get("GPSLatitude"),
                    gps_raw.get("GPSLatitudeRef", "N")
                )
                lng = _dms_to_decimal(
                    gps_raw.get("GPSLongitude"),
                    gps_raw.get("GPSLongitudeRef", "E")
                )

                if lat is not None and lng is not None:
                    return {
                        "lat":       lat,
                        "lng":       lng,
                        "altitude":  _safe_float(gps_raw.get("GPSAltitude")),
                        "timestamp": str(gps_raw.get("GPSTimeStamp", "")),
                        "source":    "pillow_exif"
                    }
    except Exception:
        pass   # fall through to exifread

    # ── Attempt 2: exifread (handles more edge cases) ──────────────
    try:
        tags = exifread.process_file(
            io.BytesIO(file_bytes),
            details=False,
            stop_tag="GPS GPSLongitude"
        )

        lat_tag  = tags.get("GPS GPSLatitude")
        lat_ref  = tags.get("GPS GPSLatitudeRef")
        lng_tag  = tags.get("GPS GPSLongitude")
        lng_ref  = tags.get("GPS GPSLongitudeRef")

        if lat_tag and lng_tag:
            lat = _exifread_dms_to_decimal(lat_tag.values, str(lat_ref))
            lng = _exifread_dms_to_decimal(lng_tag.values, str(lng_ref))

            if lat is not None and lng is not None:
                return {
                    "lat":       lat,
                    "lng":       lng,
                    "altitude":  None,
                    "timestamp": str(tags.get("GPS GPSTimeStamp", "")),
                    "source":    "exifread"
                }
    except Exception:
        pass

    return None   # no GPS found in image


def extract_gps_from_video(file_path: str) -> Optional[dict]:
    """
    Extract GPS coordinates from video metadata using ffprobe.
    Handles MP4, MOV, AVI. Smartphones embed GPS in the 'location'
    tag of the format metadata.

    Returns { lat, lng, altitude } or None.
    """
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",         "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                file_path
            ],
            capture_output=True,
            text=True,
            timeout=15
        )

        if result.returncode != 0:
            return None

        probe_data = json.loads(result.stdout)
        tags       = probe_data.get("format", {}).get("tags", {})

        # iOS / Android embed location as "+12.9716+077.5946+920.000/"
        # Key names vary by device: 'location', 'com.apple.quicktime.location.ISO6709'
        location_str = (
            tags.get("location") or
            tags.get("com.apple.quicktime.location.ISO6709") or
            tags.get("location-eng") or
            ""
        ).strip().rstrip("/")

        if location_str:
            coords = _parse_iso6709(location_str)
            if coords:
                return {**coords, "source": "ffprobe_video"}

        # Fallback: some cameras write lat/lng as separate tags
        lat = tags.get("GPSLatitude")
        lng = tags.get("GPSLongitude")
        if lat and lng:
            return {
                "lat":    float(lat),
                "lng":    float(lng),
                "altitude": None,
                "source": "ffprobe_tags"
            }

    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception):
        pass

    return None


# ── GEO VALIDATION ───────────────────────────────────────────────────


def validate_location(
    gps_coords: dict,
    registered_city: str,
    max_radius_km: float = 100.0
) -> dict:
    """
    Validates that GPS coordinates from the uploaded file are within
    max_radius_km of the carpenter's registered city.

    100km radius is intentional — carpenters often travel to job sites
    in neighboring districts. Mysuru-based carpenter working in Mandya
    (60km away) is legitimate.

    Returns a validation result dict.
    """

    if not gps_coords:
        return {
            "valid":           False,
            "reason":          "no_gps_data",
            "message":         "No GPS data found in the uploaded file.",
            "distance_km":     None,
            "work_location":   None,
            "registered_city": registered_city
        }

    work_lat = gps_coords["lat"]
    work_lng = gps_coords["lng"]

    # Reverse geocode the work location
    work_location_name = reverse_geocode(work_lat, work_lng)

    # Geocode the registered city
    registered_coords = geocode_city(registered_city)
    if not registered_coords:
        return {
            "valid":           False,
            "reason":          "city_not_found",
            "message":         f"Could not geocode registered city: {registered_city}",
            "distance_km":     None,
            "work_location":   work_location_name,
            "registered_city": registered_city
        }

    # Calculate straight-line distance
    distance_km = round(
        geodesic(
            (registered_coords["lat"], registered_coords["lng"]),
            (work_lat, work_lng)
        ).kilometers,
        1
    )

    is_valid = distance_km <= max_radius_km

    return {
        "valid":           is_valid,
        "reason":          "within_radius" if is_valid else "too_far",
        "message": (
            f"Work location verified — {distance_km}km from {registered_city}."
            if is_valid else
            f"Work location ({work_location_name}) is {distance_km}km from "
            f"{registered_city}. Maximum allowed radius is {max_radius_km}km."
        ),
        "distance_km":       distance_km,
        "work_location":     work_location_name,
        "registered_city":   registered_city,
        "work_coords":       {"lat": work_lat, "lng": work_lng},
        "registered_coords": registered_coords
    }


# ── GEOCODING HELPERS ────────────────────────────────────────────────


def reverse_geocode(lat: float, lng: float) -> str:
    """Turns GPS coordinates into a human-readable place name."""
    try:
        location = geolocator.reverse(
            f"{lat}, {lng}",
            language="en",
            timeout=5
        )
        if location:
            addr = location.raw.get("address", {})
            # Build readable string: village/suburb, district, state
            parts = [
                addr.get("village") or addr.get("suburb") or addr.get("town"),
                addr.get("county") or addr.get("district"),
                addr.get("state")
            ]
            return ", ".join(p for p in parts if p)
        return f"{lat:.4f}, {lng:.4f}"
    except Exception:
        return f"{lat:.4f}, {lng:.4f}"


def geocode_city(city_name: str) -> Optional[dict]:
    """Converts a city name to lat/lng. Biased toward Karnataka, India."""
    try:
        # Add India context to avoid ambiguity
        query    = f"{city_name}, Karnataka, India"
        location = geolocator.geocode(query, timeout=5)
        if location:
            return {"lat": location.latitude, "lng": location.longitude}

        # Retry without Karnataka in case the city is in another state
        location = geolocator.geocode(f"{city_name}, India", timeout=5)
        if location:
            return {"lat": location.latitude, "lng": location.longitude}

        return None
    except Exception:
        return None


# ── COORDINATE FORMAT CONVERTERS ─────────────────────────────────────


def _dms_to_decimal(dms_values, ref: str) -> Optional[float]:
    """
    Converts Pillow DMS (degrees, minutes, seconds) tuples to decimal degrees.
    DMS values come as IFDRational objects.
    """
    if not dms_values or len(dms_values) < 3:
        return None
    try:
        degrees = float(dms_values[0])
        minutes = float(dms_values[1])
        seconds = float(dms_values[2])
        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
        if ref in ("S", "W"):
            decimal *= -1
        return round(decimal, 7)
    except (TypeError, ZeroDivisionError):
        return None


def _exifread_dms_to_decimal(dms_values, ref: str) -> Optional[float]:
    """
    Same conversion but for exifread Ratio objects.
    """
    if not dms_values or len(dms_values) < 3:
        return None
    try:
        degrees = float(dms_values[0].num) / float(dms_values[0].den)
        minutes = float(dms_values[1].num) / float(dms_values[1].den)
        seconds = float(dms_values[2].num) / float(dms_values[2].den)
        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
        if ref.strip() in ("S", "W"):
            decimal *= -1
        return round(decimal, 7)
    except (AttributeError, ZeroDivisionError):
        return None


def _parse_iso6709(location_str: str) -> Optional[dict]:
    """
    Parses ISO 6709 location strings from smartphone video metadata.
    Format examples:
      "+12.9716+077.5946+920.000/"   (Bengaluru)
      "+15.3173+075.7139/"           (Dharwad)
    """
    import re
    # Match signed lat/lng with optional altitude
    pattern = r'([+-]\d{2,3}\.\d+)([+-]\d{2,3}\.\d+)([+-]\d+\.\d+)?'
    match   = re.search(pattern, location_str)
    if match:
        return {
            "lat":      float(match.group(1)),
            "lng":      float(match.group(2)),
            "altitude": float(match.group(3)) if match.group(3) else None
        }
    return None


def _safe_float(value) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None