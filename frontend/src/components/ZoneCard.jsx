import {
  MapPin,
  CloudRain,
  Waves,
  ArrowUpRight,
} from "lucide-react";

import RiskBadge from "./RiskBadge";

export default function ZoneCard({
  zone,
  selected,
  onClick,
}) {
  return (
    <button
      className={`zone-card ${selected ? "zone-selected" : ""}`}
      onClick={onClick}
    >
      <div className="zone-card-top">
        <div className="zone-location">
          <MapPin size={17} />

          <div>
            <h3>{zone.zone_name}</h3>
            <p>{zone.city}</p>
          </div>
        </div>

        <ArrowUpRight size={18} className="zone-arrow" />
      </div>

      <div className="zone-risk-row">
        <RiskBadge level={zone.risk_level} />

        <span className="risk-number">
          {zone.risk_score}/100
        </span>
      </div>

      <div className="risk-progress">
        <div
          className={`risk-progress-fill fill-${zone.risk_level.toLowerCase()}`}
          style={{
            width: `${zone.risk_score}%`,
          }}
        />
      </div>

      <div className="zone-metrics">
        <div>
          <CloudRain size={16} />
          <span>{zone.factors.rainfall_mm} mm rainfall</span>
        </div>

        <div>
          <Waves size={16} />
          <span>{zone.factors.water_level_percent}% water indicator</span>
        </div>
      </div>
    </button>
  );
}