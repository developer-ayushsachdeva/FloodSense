import json
import time
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

CACHE_TTL_SECONDS = 600
REQUEST_TIMEOUT_SECONDS = 15

# Representative weather-grid points across Uttar Pradesh.
# These are not complete geographic coverage of each region.
UP_ZONES = [
    {
        "id": "ZONE-001",
        "name": "Western UP",
        "city": "Meerut",
        "latitude": 28.9845,
        "longitude": 77.7064,
    },
    {
        "id": "ZONE-002",
        "name": "Braj Region",
        "city": "Agra",
        "latitude": 27.1767,
        "longitude": 78.0081,
    },
    {
        "id": "ZONE-003",
        "name": "Central UP",
        "city": "Lucknow",
        "latitude": 26.8467,
        "longitude": 80.9462,
    },
    {
        "id": "ZONE-004",
        "name": "Rohilkhand",
        "city": "Bareilly",
        "latitude": 28.3670,
        "longitude": 79.4304,
    },
    {
        "id": "ZONE-005",
        "name": "Eastern UP",
        "city": "Varanasi",
        "latitude": 25.3176,
        "longitude": 82.9739,
    },
    {
        "id": "ZONE-006",
        "name": "Terai Region",
        "city": "Gorakhpur",
        "latitude": 26.7606,
        "longitude": 83.3732,
    },
]

_cache = {
    "data": None,
    "fetched_at": None,
    "expires_at": 0,
}


def fetch_weather(latitude: float, longitude: float) -> dict:
    """Fetch current conditions and hourly precipitation forecasts."""

    params = urlencode({
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "precipitation,"
            "rain,"
            "weather_code"
        ),
        "hourly": (
            "precipitation_probability,"
            "precipitation,"
            "rain"
        ),
        "forecast_days": 2,
        "timezone": "Asia/Kolkata",
    })

    request = Request(
        f"{OPEN_METEO_URL}?{params}",
        headers={"User-Agent": "FloodSense-Hackathon/1.0"},
    )

    with urlopen(
        request,
        timeout=REQUEST_TIMEOUT_SECONDS,
    ) as response:
        payload = json.loads(response.read().decode("utf-8"))

    current = payload.get("current")
    hourly = payload.get("hourly")

    if not isinstance(current, dict):
        raise ValueError("Weather response has no current conditions.")

    if not isinstance(hourly, dict):
        raise ValueError("Weather response has no hourly forecast.")

    required_current_fields = [
        "temperature_2m",
        "precipitation",
        "rain",
        "weather_code",
    ]

    if any(current.get(key) is None for key in required_current_fields):
        raise ValueError("Weather response is missing required measurements.")

    return {
        "current": current,
        "hourly": hourly,
        "units": {
            "current": payload.get("current_units", {}),
            "hourly": payload.get("hourly_units", {}),
        },
    }


def get_weather_zones(force_refresh: bool = False) -> dict:
    """
    Return weather data for all six representative UP locations.

    Successful results are cached for ten minutes.
    If refreshing fails but cached data exists, return the cached
    results with an explicit stale-data indicator.
    """

    now = time.time()

    if (
        not force_refresh
        and _cache["data"] is not None
        and now < _cache["expires_at"]
    ):
        return {
            **_cache["data"],
            "cache_status": "CACHED",
        }

    zones = []
    errors = []

    for zone in UP_ZONES:
        try:
            weather = fetch_weather(
                zone["latitude"],
                zone["longitude"],
            )

            zones.append({
                **zone,
                **weather,
                "status": "AVAILABLE",
            })

        except Exception as exc:
            errors.append({
                "zone_id": zone["id"],
                "error": str(exc),
            })

            zones.append({
                **zone,
                "current": None,
                "hourly": None,
                "units": None,
                "status": "UNAVAILABLE",
            })

    fetched_at = datetime.now(timezone.utc).isoformat()

    result = {
        "count": len(zones),
        "zones": zones,
        "data_source": "OPEN_METEO",
        "fetched_at": fetched_at,
        "data_type": (
            "Weather-model current conditions and forecasts; "
            "not verified flood or water-level measurements."
        ),
        "errors": errors,
    }

    # Update the cache only if every location returned usable data.
    # Never replace a complete cache with a partial response.
    if not errors:
        _cache["data"] = result
        _cache["fetched_at"] = fetched_at
        _cache["expires_at"] = now + CACHE_TTL_SECONDS

        return {
            **result,
            "cache_status": "FRESH",
        }

    # Preserve usable previous data, but explicitly flag that it is stale.
    if _cache["data"] is not None:
        return {
            **_cache["data"],
            "cache_status": "STALE_FALLBACK",
            "refresh_errors": errors,
        }

    return {
        **result,
        "cache_status": "PARTIAL_OR_UNAVAILABLE",
    }