from services.weather_service import get_weather_zones

result = get_weather_zones()

print("Source:", result["data_source"])
print("Fetched at:", result["fetched_at"])
print("Cache status:", result["cache_status"])

for zone in result["zones"]:
    print("\n", zone["name"], "-", zone["city"])

    if zone["status"] != "AVAILABLE":
        print("Weather unavailable")
        continue

    current = zone["current"]

    print("Temperature:", current["temperature_2m"], "°C")
    print("Current precipitation:", current["precipitation"], "mm")
    print("Rain:", current["rain"], "mm")