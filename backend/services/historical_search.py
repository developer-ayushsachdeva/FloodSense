import json
import math
from pathlib import Path


DATA_FILE = (
    Path(__file__).parent.parent
    / "data"
    / "historical_incidents.json"
)


FEATURES = [
    "rainfall_mm",
    "water_level_percent",
    "drainage_capacity_mm",
]


def load_incidents():
    """Load the simulated historical incident dataset."""

    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def calculate_similarity(zone, incident, incidents):
    """
    Calculate a transparent numerical similarity index.

    This score measures similarity between three numerical
    indicators. It is not a flood probability.
    """

    total_squared_distance = 0.0

    for feature in FEATURES:
        values = [
            float(item[feature])
            for item in incidents
        ]

        feature_range = max(values) - min(values)

        # Avoid division by zero when a feature has no variation.
        if feature_range == 0:
            feature_range = 1.0

        difference = abs(
            float(zone[feature]) - float(incident[feature])
        )

        normalized_difference = min(
            difference / feature_range,
            1.0,
        )

        total_squared_distance += normalized_difference ** 2

    distance = math.sqrt(
        total_squared_distance / len(FEATURES)
    )

    return round((1.0 - distance) * 100, 2)


def find_similar_incidents(zone: dict, limit: int = 3) -> dict:
    """
    Retrieve incidents with same-zone priority.

    Ranking:
    1. Incidents from the selected zone.
    2. Other incidents, ordered by numerical condition similarity.
    """

    incidents = load_incidents()

    if not incidents:
        return {
            "zone_id": zone["id"],
            "matches": [],
            "match_count": 0,
            "data_source": "SIMULATED_DEMO_DATA",
            "message": "No incident records are available.",
        }

    ranked_incidents = []

    for incident in incidents:
        same_zone = (
            incident["zone_name"].strip().casefold()
            == zone["name"].strip().casefold()
        )

        similarity = calculate_similarity(
            zone,
            incident,
            incidents,
        )

        ranked_incidents.append({
            **incident,
            "similarity_score": similarity,
            "match_type": (
                "SAME_ZONE" if same_zone
                else "CROSS_ZONE"
            ),
            "match_explanation": (
                "This record is from the selected zone. "
                "Its numerical similarity is calculated from "
                "rainfall, water-level indicator, and "
                "drainage-capacity indicator."
                if same_zone
                else
                "This record is from another zone. It is included "
                "because its numerical conditions can provide "
                "a comparison with the selected zone."
            ),
        })

    # Same-zone records come first.
    # Within each group, rank by numerical similarity.
    ranked_incidents.sort(
        key=lambda item: (
            item["match_type"] == "SAME_ZONE",
            item["similarity_score"],
        ),
        reverse=True,
    )

    matches = ranked_incidents[:max(1, min(limit, 10))]

    return {
        "zone_id": zone["id"],
        "zone_name": zone["name"],
        "match_count": len(matches),
        "matches": matches,
        "data_source": "SIMULATED_DEMO_DATA",
        "ranking_method": (
            "Same-zone priority, followed by numerical "
            "condition similarity."
        ),
        "explanation": (
            "Incidents from the selected zone are prioritized. "
            "Other zones are ranked by similarity across rainfall, "
            "water-level indicator, and drainage-capacity indicator."
        ),
        "warning": (
            "These are simulated demonstration records. Similarity "
            "scores are not flood probabilities or verified "
            "historical findings. Verify real-world conditions "
            "before making emergency or public-safety decisions."
        ),
    }