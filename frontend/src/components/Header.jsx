import { Waves, Activity, RefreshCw } from "lucide-react";

export default function Header({ onRefresh, loading }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">
          <Waves size={25} />
        </div>

        <div>
          <h1>FloodSense</h1>
          <p>Urban Flood Intelligence</p>
        </div>
      </div>

      <div className="header-right">
        <div className="live-status">
          <span className="status-dot" />
          DEMO MONITORING
        </div>

        <button
          className="refresh-button"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "spin" : ""}
          />
          Refresh
        </button>
      </div>
    </header>
  );
}