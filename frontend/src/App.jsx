import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Droplets,
  Gauge,
  MapPinned,
  ShieldAlert,
  Sparkles,
  CloudRain,
  Thermometer,
} from "lucide-react";

import Header from "./components/Header";
import StatCard from "./components/StatCard";
import RiskBadge from "./components/RiskBadge";
import ZoneCard from "./components/ZoneCard";
import AIIntelligence from "./components/AIIntelligence";

import {
  getRiskSummary,
  getZones,
  getZoneDetails,
  getHistoricalIntelligence,
} from "./services/api";

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(digits);
}

function formatTimestamp(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function getRiskDescription(level) {
  switch (level) {
    case "HIGH":
      return "Elevated rainfall indicators. Review local conditions and follow official advisories.";
    case "MEDIUM":
      return "Moderate weather-related indicators. Continue monitoring rainfall and local alerts.";
    case "LOW":
      return "Lower weather-based screening score at the time of assessment. Flooding is still possible.";
    case "UNAVAILABLE":
      return "Weather data is unavailable for this zone, so a reliable screening assessment cannot be produced.";
    default:
      return "Risk assessment is not currently available.";
  }
}

function App() {
  const [summary, setSummary] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);

  const [weatherMeta, setWeatherMeta] = useState({
    cache_status: null,
    fetched_at: null,
    data_source: null,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [historicalData, setHistoricalData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Load the dashboard summary and weather-based risk assessments.
  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [summaryData, zoneData] = await Promise.all([
        getRiskSummary(),
        getZones(),
      ]);

      const zoneList = Array.isArray(zoneData?.zones)
        ? zoneData.zones
        : [];

      setSummary(summaryData);
      setZones(zoneList);

      setWeatherMeta({
        cache_status: zoneData?.cache_status ?? summaryData?.cache_status ?? null,
        fetched_at: zoneData?.fetched_at ?? summaryData?.fetched_at ?? null,
        data_source: zoneData?.data_source ?? summaryData?.data_source ?? null,
      });

      // Preserve the currently selected zone when possible.
      setSelectedZone((previous) => {
        if (!previous) {
          return zoneList[0] ?? null;
        }

        return (
          zoneList.find(
            (zone) =>
              zone.zone_id === previous.zone_id ||
              zone.id === previous.zone_id ||
              zone.zone_id === previous.id ||
              zone.id === previous.id
          ) ??
          zoneList[0] ??
          null
        );
      });
    } catch (err) {
      console.error("Dashboard loading failed:", err);

      setError(
        "Unable to load dashboard data. Check that the FloodSense backend is running and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Load historical demo records for the selected zone.
  useEffect(() => {
    if (!selectedZone) {
      setHistoricalData(null);
      setHistoryError("");
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");
      setHistoricalData(null);

      try {
        const zoneId =
          selectedZone.zone_id ??
          selectedZone.id;

        const data = await getHistoricalIntelligence(zoneId);

        if (!cancelled) {
          setHistoricalData(data);
        }
      } catch (err) {
        console.error("Historical intelligence loading failed:", err);

        if (!cancelled) {
          setHistoryError(
            "Historical demo records could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedZone?.zone_id, selectedZone?.id]);

  // Fetch the latest details when the user selects a zone.
  const handleZoneSelect = useCallback(async (zone) => {
    setSelectedZone(zone);
    setError("");

    const zoneId = zone?.zone_id ?? zone?.id;

    if (!zoneId) return;

    try {
      const details = await getZoneDetails(zoneId);

      setSelectedZone((current) => {
        const currentId = current?.zone_id ?? current?.id;

        // Avoid replacing details if the user selected another zone meanwhile.
        if (currentId !== zoneId) {
          return current;
        }

        return {
          ...zone,
          ...details,
        };
      });
    } catch (err) {
      console.error("Zone details loading failed:", err);

      // The zone card data remains available even if detail fetching fails.
    }
  }, []);

  const handleRefresh = useCallback(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  const riskCounts = {
    high:
      summary?.high_risk ??
      zones.filter((zone) => zone.risk_level === "HIGH").length,

    medium:
      summary?.medium_risk ??
      zones.filter((zone) => zone.risk_level === "MEDIUM").length,

    low:
      summary?.low_risk ??
      zones.filter((zone) => zone.risk_level === "LOW").length,

    unavailable:
      summary?.unavailable_zones ??
      zones.filter((zone) => zone.risk_level === "UNAVAILABLE").length,
  };

  const assessedZones =
    summary?.assessed_zones ??
    zones.filter((zone) => zone.risk_level !== "UNAVAILABLE").length;

  const totalZones =
    summary?.total_zones ??
    zones.length;

  const sourceLabel =
    weatherMeta.data_source === "OPEN_METEO"
      ? "Open-Meteo"
      : weatherMeta.data_source ?? "Weather source";

  const cacheLabel = weatherMeta.cache_status
    ? String(weatherMeta.cache_status).replaceAll("_", " ")
    : "Status unavailable";

  const selectedFactors = selectedZone?.factors ?? {};

  const historicalRecords = Array.isArray(historicalData)
    ? historicalData
    : Array.isArray(historicalData?.matches)
      ? historicalData.matches
      : Array.isArray(historicalData?.incidents)
        ? historicalData.incidents
        : [];

  return (
    <div className="app">
      <Header onRefresh={handleRefresh} />

      <main className="dashboard">
        {/* Dashboard introduction */}
        <section className="welcome-section">
          <div className="welcome-content">
            <div className="eyebrow">
              <Activity size={15} />
              <span>WEATHER-BASED FLOOD INTELLIGENCE</span>
            </div>

            <h1>
              Monitor weather.
              <br />
              <span>Understand flood risk.</span>
            </h1>

            <p className="welcome-description">
              FloodSense analyses current weather and short-term rainfall
              forecasts across representative locations in Uttar Pradesh to
              support preliminary flood-risk screening.
            </p>

            <div className="welcome-meta">
              <span className="status-indicator">
                <span
                  className={`status-dot ${
                    error ? "status-dot-error" : ""
                  }`}
                />

                {loading
                  ? "Loading weather data..."
                  : error
                    ? "Connection issue"
                    : "Weather monitoring active"}
              </span>

              <span className="meta-divider">·</span>

              <span>
                <Clock3 size={14} />
                {weatherMeta.fetched_at
                  ? `Updated ${formatTimestamp(weatherMeta.fetched_at)}`
                  : "Update time unavailable"}
              </span>
            </div>
          </div>

          <div className="welcome-visual" aria-hidden="true">
            <div className="visual-orbit visual-orbit-outer" />
            <div className="visual-orbit visual-orbit-inner" />

            <div className="visual-icon">
              <CloudRain size={46} strokeWidth={1.3} />
            </div>

            <div className="visual-decoration visual-decoration-one">
              <Droplets size={20} />
            </div>

            <div className="visual-decoration visual-decoration-two">
              <Activity size={20} />
            </div>
          </div>
        </section>

        {/* Data source and refresh status */}
        <section className="data-status-bar">
          <div className="data-status-left">
            <CheckCircle2 size={17} />

            <div>
              <strong>{sourceLabel}</strong>
              <span>
                Weather-model data · Representative UP locations
              </span>
            </div>
          </div>

          <div className="data-status-right">
            <span className="cache-status">
              {cacheLabel}
            </span>

            <button
              type="button"
              className="refresh-button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              aria-label="Refresh dashboard"
            >
              <Activity
                size={15}
                className={refreshing ? "refreshing-icon" : ""}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {/* API error */}
        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={19} />

            <div>
              <strong>Dashboard connection issue</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="stats-grid">
       <StatCard
  type="total"
  label="Monitored Zones"
  value={loading ? "—" : totalZones}
  description="Representative locations"
/>

<StatCard
  type="low"
  label="Assessed Zones"
  value={loading ? "—" : assessedZones}
  description="With usable weather data"
/>

<StatCard
  type="high"
  label="High Risk"
  value={loading ? "—" : riskCounts.high}
  description="Elevated screening scores"
/>

<StatCard
  type="medium"
  label="Medium Risk"
  value={loading ? "—" : riskCounts.medium}
  description="Continue monitoring"
/>
        </section>

        {/* Risk distribution */}
        <section className="risk-overview">
          <div className="section-heading">
            <div>
              <div className="section-kicker">RISK OVERVIEW</div>
              <h2>Current screening summary</h2>
              <p>
                Distribution of available weather-based zone assessments.
              </p>
            </div>

            <span className="section-icon">
              <Activity size={21} />
            </span>
          </div>

          <div className="risk-distribution">
            <div className="distribution-item">
              <span className="distribution-dot distribution-high" />

              <div className="distribution-copy">
                <span>High</span>
                <strong>{loading ? "—" : riskCounts.high}</strong>
              </div>
            </div>

            <div className="distribution-item">
              <span className="distribution-dot distribution-medium" />

              <div className="distribution-copy">
                <span>Medium</span>
                <strong>{loading ? "—" : riskCounts.medium}</strong>
              </div>
            </div>

            <div className="distribution-item">
              <span className="distribution-dot distribution-low" />

              <div className="distribution-copy">
                <span>Low</span>
                <strong>{loading ? "—" : riskCounts.low}</strong>
              </div>
            </div>

            <div className="distribution-item">
              <span className="distribution-dot distribution-unavailable" />

              <div className="distribution-copy">
                <span>Unavailable</span>
                <strong>{loading ? "—" : riskCounts.unavailable}</strong>
              </div>
            </div>
          </div>

          <div className="distribution-footnote">
            <AlertCircle size={15} />

            <span>
              Screening scores are heuristic indicators, not calibrated
              flood probabilities or official flood warnings.
            </span>
          </div>
        </section>

        {/* Zone list and selected-zone details */}
        <section className="monitoring-section">
          <div className="section-heading">
            <div>
              <div className="section-kicker">LIVE WEATHER MONITORING</div>
              <h2>Zone intelligence</h2>
              <p>
                Locations ranked by preliminary weather-based screening score.
              </p>
            </div>

            <span className="zone-count">
              {zones.length} {zones.length === 1 ? "zone" : "zones"}
            </span>
          </div>

          {zones.length > 0 && (
            <div className="weather-freshness">
              <Clock3 size={14} />

              <span>
                Source: {sourceLabel}
                {" · "}
                {cacheLabel}
                {weatherMeta.fetched_at
                  ? ` · ${formatTimestamp(weatherMeta.fetched_at)}`
                  : ""}
              </span>
            </div>
          )}

          {loading && zones.length === 0 ? (
            <div className="empty-state">
              <div className="loading-spinner" />

              <h3>Loading weather intelligence</h3>

              <p>
                Fetching weather data and preparing zone assessments.
              </p>
            </div>
          ) : zones.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={32} />

              <h3>No zone data available</h3>

              <p>
                The dashboard could not retrieve any zone assessments.
                Check the backend and try again.
              </p>

              <button
                type="button"
                className="refresh-button"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="monitoring-layout">
              <div className="zone-list">
                {zones.map((zone, index) => {
                  const zoneId = zone.zone_id ?? zone.id;
                  const selectedId =
                    selectedZone?.zone_id ?? selectedZone?.id;

                  return (
                    <div
                      key={zoneId ?? `zone-${index}`}
                      className={
                        selectedId === zoneId
                          ? "zone-card-wrapper selected"
                          : "zone-card-wrapper"
                      }
                      onClick={() => handleZoneSelect(zone)}
                    >
                      <ZoneCard
  zone={zone}
  selected={selectedId === zoneId}
  onClick={() => handleZoneSelect(zone)}
/>
                    </div>
                  );
                })}
              </div>

              {/* Selected zone */}
              <div className="zone-details">
                {!selectedZone ? (
                  <div className="empty-state">
                    <MapPinned size={30} />

                    <h3>Select a zone</h3>

                    <p>
                      Choose a location to view its weather-based assessment.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="detail-header">
                      <div>
                        <div className="section-kicker">
                          SELECTED LOCATION
                        </div>

                        <h2>
                          {selectedZone.zone_name ??
                            selectedZone.name ??
                            selectedZone.zone_id ??
                            selectedZone.id}
                        </h2>

                        <p>
                          {selectedZone.region ??
                            selectedZone.location ??
                            "Representative monitoring location"}
                        </p>
                      </div>

                      <RiskBadge
                        level={
                          selectedZone.risk_level ?? "UNAVAILABLE"
                        }
                      />
                    </div>

                    <div className="selected-zone-score">
                      <div>
                        <span>Screening score</span>

                        <strong>
                          {selectedZone.risk_score === null ||
                          selectedZone.risk_score === undefined
                            ? "—"
                            : `${selectedZone.risk_score}/100`}
                        </strong>
                      </div>

                      <p>
                        {getRiskDescription(selectedZone.risk_level)}
                      </p>
                    </div>

                    {/* Weather measurements */}
                    <div className="detail-metrics">
                      <div className="detail-metric">
                        <div className="metric-icon">
                          <Droplets size={18} />
                        </div>

                        <div>
                          <span>Current precipitation</span>

                          <strong>
                            {formatNumber(
                              selectedFactors.current_precipitation_mm
                            )}{" "}
                            <small>mm</small>
                          </strong>
                        </div>
                      </div>

                      <div className="detail-metric">
                        <div className="metric-icon">
                          <CloudRain size={18} />
                        </div>

                        <div>
                          <span>Next 24h precipitation</span>

                          <strong>
                            {formatNumber(
                              selectedFactors
                                .forecast_precipitation_next_24h_mm
                            )}{" "}
                            <small>mm</small>
                          </strong>
                        </div>
                      </div>

                      <div className="detail-metric">
                        <div className="metric-icon">
                          <Activity size={18} />
                        </div>

                        <div>
                          <span>Peak rain probability</span>

                          <strong>
                            {formatNumber(
                              selectedFactors
                                .max_hourly_precipitation_probability_next_24h_percent,
                              0
                            )}
                            <small>%</small>
                          </strong>
                        </div>
                      </div>

                      <div className="detail-metric">
                        <div className="metric-icon">
                          <Thermometer size={18} />
                        </div>

                        <div>
                          <span>Temperature</span>

                          <strong>
                            {formatNumber(
                              selectedFactors.temperature_c
                            )}{" "}
                            <small>°C</small>
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Risk factors */}
                    <div className="detail-section">
                      <div className="detail-section-title">
                        <Activity size={17} />

                        <h3>Assessment factors</h3>
                      </div>

                      {Array.isArray(selectedZone.reasons) &&
                      selectedZone.reasons.length > 0 ? (
                        <ul className="detail-list">
                          {selectedZone.reasons.map((reason, index) => (
                            <li key={`${index}-${reason}`}>
                              <span className="list-marker" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted-message">
                          No contributing factors are available for this zone.
                        </p>
                      )}
                    </div>

                    {/* Recommended actions */}
                    <div className="detail-section">
                      <div className="detail-section-title">
                        <ShieldAlert size={17} />

                        <h3>Recommended precautions</h3>
                      </div>

                      {Array.isArray(selectedZone.recommended_actions) &&
                      selectedZone.recommended_actions.length > 0 ? (
                        <ul className="detail-list">
                          {selectedZone.recommended_actions.map(
                            (action, index) => (
                              <li key={`${index}-${action}`}>
                                <span className="list-marker" />
                                {action}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p className="muted-message">
                          No recommendations are available.
                        </p>
                      )}
                    </div>

                    {/* Assessment metadata */}
                    <div className="assessment-metadata">
                      <div>
                        <span>Assessment type</span>

                        <strong>
                          {String(
                            selectedZone.assessment_type ??
                            "WEATHER_BASED_SCREENING"
                          ).replaceAll("_", " ")}
                        </strong>
                      </div>

                      <div>
                        <span>Weather data status</span>

                        <strong>
                          {selectedZone.data_status ??
                            selectedZone.status ??
                            "Not specified"}
                        </strong>
                      </div>

                      <div>
                        <span>Data timestamp</span>

                        <strong>
                          {formatTimestamp(
                            selectedZone.data_timestamp ??
                            weatherMeta.fetched_at
                          )}
                        </strong>
                      </div>
                    </div>

                    {selectedZone.warning && (
                      <div className="warning-note">
                        <AlertCircle size={17} />

                        <p>{selectedZone.warning}</p>
                      </div>
                    )}

                    {selectedZone.caveat && (
                      <div className="warning-note">
                        <AlertCircle size={17} />

                        <p>{selectedZone.caveat}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Historical intelligence */}
        <section className="history-section">
          <div className="section-heading">
            <div>
              <div className="section-kicker">HISTORICAL INTELLIGENCE</div>

              <h2>Similar historical records</h2>

              <p>
                Historical-demo lookup for the selected monitoring zone.
              </p>
            </div>

            <span className="section-icon">
              <Sparkles size={21} />
            </span>
          </div>

          <div className="demo-data-warning">
            <AlertCircle size={17} />

            <div>
              <strong>
                SIMULATED DEMO RECORDS — NOT VERIFIED EVENTS
              </strong>

              <p>
                These records are demonstration data. They must not be
                interpreted as confirmed historical floods or real incident
                reports.
              </p>
            </div>
          </div>

          {!selectedZone ? (
            <p className="muted-message">
              Select a zone to view its historical demo records.
            </p>
          ) : historyLoading ? (
            <div className="history-loading">
              <div className="loading-spinner" />

              <span>Searching historical demo records...</span>
            </div>
          ) : historyError ? (
            <div className="inline-error" role="alert">
              <AlertCircle size={17} />
              <span>{historyError}</span>
            </div>
          ) : historicalRecords.length > 0 ? (
            <div className="history-grid">
              {historicalRecords.map((record, index) => (
                <article
                  className="history-card"
                  key={
                    record.id ??
                    record.incident_id ??
                    `history-${index}`
                  }
                >
                  <div className="history-card-header">
                    <span className="history-label">
                      Demo record {index + 1}
                    </span>

                    {record.simulated !== false && (
                      <span className="simulated-tag">
                        Simulated
                      </span>
                    )}
                  </div>

                  <h3>
                    {record.title ??
                      record.name ??
                      record.event_type ??
                      record.incident_type ??
                      "Historical demonstration record"}
                  </h3>

                  <p>
                    {record.description ??
                      record.summary ??
                      record.notes ??
                      "No additional description is available."}
                  </p>

                  <div className="history-facts">
                    {(record.date ?? record.incident_date) && (
                      <div>
                        <span>Date</span>

                        <strong>
                          {record.date ?? record.incident_date}
                        </strong>
                      </div>
                    )}

                    {record.rainfall_mm !== undefined && (
                      <div>
                        <span>Rainfall</span>

                        <strong>
                          {formatNumber(record.rainfall_mm)} mm
                        </strong>
                      </div>
                    )}

                    {record.water_level_percent !== undefined && (
                      <div>
                        <span>Water level indicator</span>

                        <strong>
                          {formatNumber(
                            record.water_level_percent,
                            0
                          )}
                          %
                        </strong>
                      </div>
                    )}

                    {record.drainage_capacity_mm !== undefined && (
                      <div>
                        <span>Drainage capacity indicator</span>

                        <strong>
                          {formatNumber(record.drainage_capacity_mm)} mm
                        </strong>
                      </div>
                    )}
                  </div>

                  <p className="history-disclaimer">
                    Demonstration data; not independently verified.
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state history-empty">
              <MapPinned size={28} />

              <h3>No matching demo records</h3>

              <p>
                No historical demonstration records were returned for this
                zone.
              </p>
            </div>
          )}
        </section>

        {/* AI assistant */}
        <section className="ai-section">
          <div className="section-heading">
            <div>
              <div className="section-kicker">AI-POWERED ASSISTANCE</div>

              <h2>FloodSense Intelligence</h2>

              <p>
                Ask questions about weather indicators, zone assessments,
                and general flood preparedness.
              </p>
            </div>

            <span className="section-icon">
              <Sparkles size={21} />
            </span>
          </div>

          <AIIntelligence selectedZone={selectedZone} />
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <div className="footer-brand">
            <span className="footer-brand-icon">
              <Droplets size={17} />
            </span>

            <strong>FloodSense</strong>
          </div>

          <p>
            Open-Meteo weather data · Simulated historical records ·
            Preliminary screening only
          </p>

          <span className="footer-disclaimer">
            Not for emergency decisions
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;