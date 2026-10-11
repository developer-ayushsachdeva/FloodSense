export default function RiskBadge({ level }) {
  return (
    <span className={`risk-badge risk-${level?.toLowerCase()}`}>
      <span className="badge-dot" />
      {level || "UNKNOWN"} RISK
    </span>
  );
}