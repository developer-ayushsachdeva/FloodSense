const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export function getRiskSummary() {
  return request("/risk/summary");
}

export function getZones() {
  return request("/zones");
}

export function getZoneDetails(zoneId) {
  return request(`/zones/${encodeURIComponent(zoneId)}`);
}

export function getHistoricalIntelligence(zoneId) {
  return request(`/history/${encodeURIComponent(zoneId)}`);
}

export async function askFloodSenseAI(question) {
  const response = await fetch("http://127.0.0.1:8000/ai/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || "Unable to get an AI response. Please try again."
    );
  }

  return response.json();
}