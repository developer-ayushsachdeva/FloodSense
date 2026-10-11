import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.historical_search import find_similar_incidents
from services.risk_engine import calculate_flood_risk
from pydantic import BaseModel, Field
from services.ai_agent import ask_floodsense
from services.weather_service import get_weather_zones

app = FastAPI(
    title="FloodSense API",
    description="AI-powered urban flood intelligence prototype",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://main.d26sdljuj67fuc.amplifyapp.com/"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = Path(__file__).parent / "data" / "zones.json"

class AIQuery(BaseModel):
    question: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="Question about flood risk or intervention planning"
    )


def load_zones():
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


@app.get("/")
def root():
    return {
        "project": "FloodSense",
        "status": "running",
        "message": "Urban Flood Intelligence API is operational.",
        "data_mode": "SIMULATED_DEMO_DATA",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/weather")
def get_weather():
    return get_weather_zones()


@app.get("/zones")
def get_zones():
    weather_data = get_weather_zones()

    results = []

    for zone in weather_data["zones"]:
        if zone.get("status") != "AVAILABLE":
            continue

        results.append(calculate_flood_risk(zone))

    results.sort(
        key=lambda zone: zone["risk_score"],
        reverse=True,
    )

    return {
        "count": len(results),
        "data_source": weather_data["data_source"],
        "fetched_at": weather_data["fetched_at"],
        "cache_status": weather_data["cache_status"],
        "zones": results,
        "warning": (
            "Weather-based screening only. "
            "This is not an official flood forecast."
        ),
    }


@app.get("/zones/{zone_id}")
def get_zone(zone_id: str):
    weather_data = get_weather_zones()

    zone = next(
        (
            item for item in weather_data["zones"]
            if item["id"].lower() == zone_id.lower()
        ),
        None,
    )

    if zone is None:
        raise HTTPException(
            status_code=404,
            detail=f"Zone '{zone_id}' not found.",
        )

    result = calculate_flood_risk(zone)

    return {
        **result,
        "cache_status": weather_data["cache_status"],
        "fetched_at": weather_data["fetched_at"],
    }

@app.get("/history/{zone_id}")
def get_historical_intelligence(zone_id: str, limit: int = 3):
    zones = load_zones()

    zone = next(
        (
            item for item in zones
            if item["id"].lower() == zone_id.lower()
        ),
        None,
    )

    if zone is None:
        raise HTTPException(
            status_code=404,
            detail=f"Zone '{zone_id}' not found.",
        )

    if limit < 1 or limit > 10:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 10.",
        )

    return find_similar_incidents(
        zone=zone,
        limit=limit,
    )

@app.get("/risk/summary")
def get_risk_summary():
    weather_data = get_weather_zones()

    assessments = [
        calculate_flood_risk(zone)
        for zone in weather_data["zones"]
    ]

    available = [
        zone for zone in assessments
        if zone["risk_level"] in {"HIGH", "MEDIUM", "LOW"}
    ]

    unavailable_count = sum(
        zone["risk_level"] == "UNAVAILABLE"
        for zone in assessments
    )

    highest_risk_zone = (
        max(available, key=lambda zone: zone["risk_score"])
        if available else None
    )

    return {
        "total_zones": len(assessments),
        "assessed_zones": len(available),
        "unavailable_zones": unavailable_count,
        "high_risk": sum(
            zone["risk_level"] == "HIGH"
            for zone in available
        ),
        "medium_risk": sum(
            zone["risk_level"] == "MEDIUM"
            for zone in available
        ),
        "low_risk": sum(
            zone["risk_level"] == "LOW"
            for zone in available
        ),
        "highest_risk_zone": highest_risk_zone,
        "data_source": weather_data["data_source"],
        "fetched_at": weather_data["fetched_at"],
        "cache_status": weather_data["cache_status"],
        "assessment_type": "WEATHER_BASED_SCREENING",
        "warning": (
            "Weather-based screening only. This is not an official "
            "flood forecast or calibrated probability of flooding."
        ),
    }
    
    
@app.post("/ai/ask")
def ask_ai(query: AIQuery):
    try:
        return ask_floodsense(query.question)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="FloodSense AI is temporarily unavailable. Check that Ollama is running and the model is loaded."
        ) from exc
