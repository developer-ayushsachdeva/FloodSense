from datetime import datetime, timedelta


def calculate_flood_risk(zone: dict) -> dict:
    """
    Calculate a preliminary weather-based screening indicator.

    This is NOT an official flood prediction.
    It uses current precipitation and short-term forecast data.
    """

    current = zone.get("current") or {}
    hourly = zone.get("hourly") or {}

    precipitation = float(current.get("precipitation") or 0)
    rain = float(current.get("rain") or 0)

    hourly_precipitation = hourly.get("precipitation") or []
    precipitation_probability = (
        hourly.get("precipitation_probability") or []
    )
    hourly_times = hourly.get("time") or []

    # Select forecast hours occurring after the current reporting
    # time and within the following 24 hours.
    current_time = current.get("time")
    next_24h_indices = []

    if current_time:
        now = datetime.fromisoformat(current_time)
        forecast_end = now + timedelta(hours=24)

        for index, timestamp in enumerate(hourly_times):
            forecast_time = datetime.fromisoformat(timestamp)

            if now < forecast_time <= forecast_end:
                next_24h_indices.append(index)

    # Sum forecast precipitation over the next 24 hours.
    forecast_rainfall = round(
        sum(
            float(hourly_precipitation[index])
            for index in next_24h_indices
            if index < len(hourly_precipitation)
            and hourly_precipitation[index] is not None
        ),
        2,
    )

    # Maximum hourly precipitation probability over the next 24 hours.
    max_precipitation_probability = max(
        (
            float(precipitation_probability[index])
            for index in next_24h_indices
            if index < len(precipitation_probability)
            and precipitation_probability[index] is not None
        ),
        default=0.0,
    )

    # Preliminary screening score.
    # These are prototype heuristics, not calibrated flood thresholds.
    rainfall_score = min(forecast_rainfall / 50 * 100, 100)
    current_rain_score = min(precipitation / 10 * 100, 100)

    risk_score = round(
        0.65 * rainfall_score
        + 0.20 * current_rain_score
        + 0.15 * max_precipitation_probability
    )

    if risk_score >= 75:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    reasons = []

    if forecast_rainfall >= 50:
        reasons.append(
            "The next-24-hour precipitation forecast indicates "
            "substantial rainfall."
        )
    elif forecast_rainfall >= 20:
        reasons.append(
            "The next-24-hour precipitation forecast indicates "
            "moderate rainfall."
        )
    else:
        reasons.append(
            "The available next-24-hour precipitation forecast "
            "does not indicate substantial rainfall."
        )

    if max_precipitation_probability >= 70:
        reasons.append(
            "The forecast includes a high hourly precipitation probability."
        )

    if precipitation > 0:
        reasons.append(
            "Precipitation is reported for the current weather period."
        )

    if risk_level == "HIGH":
        recommendations = [
            "Verify local rainfall, water levels, and drainage conditions.",
            "Check official weather warnings and local authority advisories.",
            "Inspect known waterlogging locations if conditions warrant.",
        ]
    elif risk_level == "MEDIUM":
        recommendations = [
            "Monitor upcoming precipitation forecasts.",
            "Check official weather warnings and local advisories.",
            "Verify drainage and water levels if rainfall increases.",
        ]
    else:
        recommendations = [
            "Continue monitoring updated weather forecasts.",
            "Check official warnings if local conditions change.",
            "Do not interpret low weather-screening risk as proof "
            "that flooding is impossible.",
        ]

    return {
        "zone_id": zone["id"],
        "zone_name": zone["name"],
        "city": zone["city"],
        "risk_score": risk_score,
        "risk_level": risk_level,
        "factors": {
            "current_precipitation_mm": precipitation,
            "current_rain_mm": rain,
            "forecast_precipitation_next_24h_mm": forecast_rainfall,
            "max_hourly_precipitation_probability_next_24h_percent": (
                max_precipitation_probability
            ),
            "temperature_c": current.get("temperature_2m"),
        },
        "reasons": reasons,
        "recommended_actions": recommendations,
        "data_source": "OPEN_METEO",
        "data_status": zone.get("status", "UNKNOWN"),
        "data_timestamp": current_time,
        "assessment_type": "WEATHER_BASED_SCREENING",
        "warning": (
            "Preliminary weather-based screening only, not a calibrated "
            "flood probability or official flood forecast. Actual flooding "
            "also depends on river levels, drainage, terrain, soil saturation, "
            "and local conditions."
        ),
    }