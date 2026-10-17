/**
 * Horizontal ranked bar list (Plausible/Publytics style).
 * data: [{ x, y, visitors }]
 */
export default function BarChart({ data = [], label = 'Page', valueLabel = 'Views', formatX }) {
  if (!data.length) {
    return <div className="chart-empty">No data yet</div>;
  }

  const max = Math.max(...data.map((d) => d.y), 1);

  return (
    <div className="barlist">
      <div className="barlist-head">
        <span>{label}</span>
        <span>{valueLabel}</span>
      </div>
      {data.map((d) => (
        <div key={d.x} className="barlist-row">
          <div className="barlist-fill" style={{ width: `${(d.y / max) * 100}%` }} />
          <span className="barlist-label" title={d.x}>
            {formatX ? formatX(d.x) : d.x}
          </span>
          <span className="barlist-value">{d.y.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}