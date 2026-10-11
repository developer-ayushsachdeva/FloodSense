import {
  AlertTriangle,
  Activity,
  ShieldCheck,
  MapPinned,
} from "lucide-react";

const icons = {
  total: MapPinned,
  high: AlertTriangle,
  medium: Activity,
  low: ShieldCheck,
};

export default function StatCard({
  type,
  label,
  value,
  description,
}) {
  const Icon = icons[type];

  return (
    <article className={`stat-card stat-${type}`}>
      <div className="stat-top">
        <span>{label}</span>

        <div className="stat-icon">
          <Icon size={20} />
        </div>
      </div>

      <div className="stat-value">
        {value ?? "—"}
      </div>

      <p>{description}</p>
    </article>
  );
}