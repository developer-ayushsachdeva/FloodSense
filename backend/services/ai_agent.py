import json

from strands import Agent, tool
from strands.models.ollama import OllamaModel

from services.historical_search import find_similar_incidents
from services.risk_engine import calculate_flood_risk
from services.weather_service import get_weather_zones

# --------------------------------------------------
# Configuration
# --------------------------------------------------

OLLAMA_HOST = "http://localhost:11434"
OLLAMA_MODEL_ID = "qwen2.5:3b"


# --------------------------------------------------
# Load zone data
# --------------------------------------------------

def load_zones():
    from pathlib import Path

    data_file = (
        Path(__file__).parent.parent
        / "data"
        / "zones.json"
    )

    with data_file.open("r", encoding="utf-8") as file:
        return json.load(file)


# --------------------------------------------------
# Tool 1: Retrieve flood-risk assessment
# --------------------------------------------------

@tool
def get_zone_risk(zone_name: str) -> dict:
    """Retrieve a weather-based risk assessment for a UP location."""

    result = get_weather_zones()
    zones = result.get("zones", [])
    query = zone_name.strip().casefold()

    zone = next(
        (
            item for item in zones
            if query in {
                item["id"].casefold(),
                item["name"].casefold(),
                item["city"].casefold(),
            }
        ),
        None,
    )

    if zone is None:
        return {
            "error": f"Location '{zone_name}' was not found.",
            "available_locations": [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "city": item["city"],
                }
                for item in zones
            ],
        }

    if zone.get("status") != "AVAILABLE":
        return {
            "zone_name": zone["name"],
            "city": zone["city"],
            "risk_level": "UNAVAILABLE",
            "risk_score": None,
            "message": (
                "Weather data is unavailable. "
                "A reliable screening score cannot be calculated."
            ),
            "data_source": result.get("data_source"),
        }

    assessment = calculate_flood_risk(zone)
    assessment["cache_status"] = result.get("cache_status")
    assessment["weather_fetched_at"] = result.get("fetched_at")

    return assessment


# --------------------------------------------------
# Tool 2: Search similar historical incidents
# --------------------------------------------------

@tool
def search_historical_incidents(
    zone_name: str,
    limit: int = 3,
) -> dict:
    """Find simulated historical incidents relevant to a UP location."""

    result = get_weather_zones()
    zones = result.get("zones", [])
    query = zone_name.strip().casefold()

    zone = next(
        (
            item for item in zones
            if query in {
                item["id"].casefold(),
                item["name"].casefold(),
                item["city"].casefold(),
            }
        ),
        None,
    )

    if zone is None:
        return {
            "error": f"Location '{zone_name}' was not found.",
            "available_locations": [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "city": item["city"],
                }
                for item in zones
            ],
        }

    return {
        "zone_id": zone["id"],
        "zone_name": zone["name"],
        "city": zone["city"],
        "matches": [],
        "match_count": 0,
        "data_source": "SIMULATED_DEMO_DATA",
        "message": (
            f"No historical incident records are configured for "
            f"{zone['city']}. The existing demo records cover "
            "Noida and Greater Noida only."
        ),
        "warning": (
            "No verified historical incidents are available for "
            "this location. Do not infer historical flood events "
            "from current weather data."
        ),
    }

# --------------------------------------------------
# Local Strands agent using Ollama
# --------------------------------------------------

model = OllamaModel(
    host=OLLAMA_HOST,
    model_id=OLLAMA_MODEL_ID,
)

agent = Agent(
    model=model,
    tools=[
        get_zone_risk,
        search_historical_incidents,
    ],
    system_prompt="""
You are FloodSense AI, an urban flood-risk explanation
and intervention-planning assistant.

YOUR OBJECTIVE:
Turn retrieved flood-risk assessments into concise,
evidence-based, prioritized planning recommendations.

DATA INTEGRITY:
1. Current weather conditions and forecasts come from the
   Open-Meteo weather service.
2. Historical incident records are SIMULATED demonstration data.
3. Never claim to have live sensor, satellite, water-level,
   drainage, or emergency-service information.
4. Never describe simulated incidents as verified events.
5. Use get_zone_risk to retrieve zone risk assessments.
6. Use search_historical_incidents when historical comparisons
   are relevant to the question.
7. Never invent measurements, risk scores, incident records,
   or evidence.
8. Risk scores are prototype indicators, NOT calibrated
   probabilities of flooding.
9. Clearly distinguish weather-model data from simulated
   historical records in your responses.
10. If weather data is unavailable, report it as unavailable
    instead of inventing a risk assessment.

REASONING:
1. Identify the zone requested by the user.
2. Retrieve its calculated risk assessment before explaining it.
3. Identify the most important contributing risk factors.
4. Use historical retrieval when relevant and distinguish
   similarity from proof of future flooding.
5. Recommend practical interventions in priority order.
6. Explain briefly why each recommendation matters.
7. If information is unavailable, explicitly say so.
8. Do not claim that an intervention has been executed.

RECOMMENDATION PRIORITIES:
- Priority 1: Verify water-level and drainage conditions.
- Priority 2: Assess whether warnings or access restrictions
  are warranted, subject to local authority verification.
- Priority 3: Evaluate drainage inspection, water removal,
  and alternative routes where relevant.
- Adapt recommendations to the retrieved evidence.
- Do not automatically recommend every action for every zone.

MULTI-ZONE QUESTIONS:
- Retrieve assessments for the zones being compared.
- Compare their calculated scores and contributing factors.
- Explain the ranking using retrieved data.
- Do not claim that a ranking represents verified real-world
  emergency severity.

RESPONSE FORMAT:
## Risk Assessment
State the zone, calculated score, and risk category.

## Key Evidence
Give at most three concise findings from retrieved data.

## Prioritized Interventions
Provide up to three numbered actions, each with a short reason.

## Limitations
State that the data is simulated and real-world conditions
must be independently verified.

STYLE:
- Be concise, direct, and non-repetitive.
- Use Markdown headings and bullet points.
- Avoid repeating the same risk factor in multiple sections.
- Never invent precision or unsupported conclusions.
"""
)


# --------------------------------------------------
# Public function for the FastAPI endpoint
# --------------------------------------------------

def ask_floodsense(question: str) -> dict:
    """
    Ask FloodSense AI a question using the local model.
    """
    response = agent(question)

    answer = str(response)

    return {
        "question": question,
        "answer": answer,
        "model": OLLAMA_MODEL_ID,
        "agent_framework": "Strands Agents SDK",
        "data_source": "SIMULATED_DEMO_DATA",
        "warning": (
            "AI-generated decision-support response. "
            "Underlying zone and incident records are simulated. "
            "Verify real-world conditions before operational use."
        ),
    }