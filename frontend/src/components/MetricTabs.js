/**
 * The selectable KPI strip across the top of the dashboard.
 * Clicking a tile switches the metric shown in the main chart.
 */
export default function MetricTabs({ tabs, active, onSelect }) {
  return (
    <div className="metric-tabs" role="tablist">
      {tabs.map((t) => {
        const selectable = Boolean(t.metric);
        const isActive = selectable && t.metric === active;

        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            className={`metric-tab ${isActive ? 'is-active' : ''} ${
              selectable ? '' : 'is-static'
            }`}
            onClick={() => selectable && onSelect(t.metric)}
            disabled={!selectable}
          >
            <span className="metric-tab-label">{t.label}</span>
            <span className="metric-tab-value">{t.value}</span>
            {typeof t.change === 'number' && (
              <span className={`metric-tab-change ${t.change >= 0 ? 'up' : 'down'}`}>
                {t.change >= 0 ? '▲' : '▼'} {Math.abs(t.change)}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
