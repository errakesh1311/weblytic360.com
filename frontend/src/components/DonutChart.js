/**
 * Hand-rolled SVG donut chart with a legend list underneath — used for the
 * Devices breakdown (Desktop / Mobile / Tablet) like the Publytics dashboard.
 * No chart dependencies.
 */
const DEVICE_META = {
  desktop: { label: 'Desktop', color: '#7cc5f0', icon: '🖥️' },
  mobile: { label: 'Mobile', color: '#1b3b5f', icon: '📱' },
  tablet: { label: 'Tablet', color: '#8b2fb0', icon: '📟' },
};

const polar = (cx, cy, r, angle) => {
  const a = (angle - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

function arcPath(cx, cy, rOuter, rInner, start, end) {
  const [x1, y1] = polar(cx, cy, rOuter, end);
  const [x2, y2] = polar(cx, cy, rOuter, start);
  const [x3, y3] = polar(cx, cy, rInner, start);
  const [x4, y4] = polar(cx, cy, rInner, end);
  const large = end - start <= 180 ? 0 : 1;
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export default function DonutChart({ rows = [] }) {
  // Normalise into known device buckets.
  const total = rows.reduce((sum, r) => sum + (r.y || 0), 0);
  const keys = Object.keys(DEVICE_META);
  const data = keys.map((key) => {
    const match = rows.find((r) => String(r.x).toLowerCase() === key);
    const value = match ? match.y : 0;
    return {
      key,
      ...DEVICE_META[key],
      value,
      pct: total ? Math.round((value / total) * 100) : 0,
    };
  });

  const cx = 90;
  const cy = 90;
  const rOuter = 80;
  const rInner = 48;

  let cursor = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const sweep = (d.value / total) * 360;
      const path =
        sweep >= 359.999
          ? null // full circle handled separately
          : arcPath(cx, cy, rOuter, rInner, cursor, cursor + sweep);
      const slice = { ...d, path, full: sweep >= 359.999 };
      cursor += sweep;
      return slice;
    });

  return (
    <div className="donut">
      <div className="donut__chart">
        <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Devices">
          {total === 0 && (
            <circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} fill="none" stroke="#e2e8f0" strokeWidth={rOuter - rInner} />
          )}
          {slices.map((s) =>
            s.full ? (
              <circle
                key={s.key}
                cx={cx}
                cy={cy}
                r={(rOuter + rInner) / 2}
                fill="none"
                stroke={s.color}
                strokeWidth={rOuter - rInner}
              />
            ) : (
              <path key={s.key} d={s.path} fill={s.color} />
            )
          )}
        </svg>
      </div>

      <ul className="donut__legend">
        {data.map((d) => (
          <li key={d.key} className="donut__row">
            <span className="donut__icon" style={{ background: d.color }} aria-hidden="true">
              {d.icon}
            </span>
            <span className="donut__label">{d.label}</span>
            <span className="donut__value">
              {d.value} <em>({d.pct}%)</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
