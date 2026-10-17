/**
 * Dependency-free SVG area/line chart.
 * data: [{ bucket, pageviews, visitors, sessions }]
 */
export default function LineChart({ data = [], metric = 'pageviews', height = 220 }) {
  if (!data.length) {
    return <div className="chart-empty">No data for this period</div>;
  }

  const width = 800;
  const padding = { top: 16, right: 8, bottom: 24, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = data.map((d) => Number(d[metric]) || 0);
  const max = Math.max(...values, 1);

  const x = (i) =>
    padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => padding.top + innerH - (v / max) * innerH;

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${padding.top + innerH} L${x(0)},${
    padding.top + innerH
  } Z`;

  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="w360-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={y(t)}
            y2={y(t)}
            className="chart-grid"
          />
          <text x={padding.left - 8} y={y(t) + 4} className="chart-axis" textAnchor="end">
            {t}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#w360-area)" />
      <path d={line} className="chart-line" />

      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3" className="chart-dot">
          <title>{`${data[i].bucket}: ${v} ${metric}`}</title>
        </circle>
      ))}

      {data.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={d.bucket} x={x(i)} y={height - 6} className="chart-axis" textAnchor="middle">
            {String(d.bucket).slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}