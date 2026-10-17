import { useState } from 'react';

const COLORS = {
  visitors: '#0d9488',
  sessions: '#6366f1',
  pageviews: '#0891b2',
  bounceRate: '#f59e0b',
  referrals: '#0d9488',
  crawls: '#6366f1',
  y: '#0891b2',
};

function formatBucket(bucket) {
  if (!bucket) return '';
  // 'YYYY-MM-DDTHH:00' -> 'HH:00', 'YYYY-MM-DD' -> 'DD MMM'
  if (bucket.includes('T')) return bucket.slice(11);
  const d = new Date(`${bucket}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * Dependency-free SVG area chart with a hover tooltip.
 * data: [{ bucket, pageviews, visitors, sessions }]
 */
export default function AreaChart({ data = [], metric = 'visitors', height = 300 }) {
  const [hover, setHover] = useState(null);

  if (!data.length) {
    return <div className="chart-empty">No data for this period</div>;
  }

  const width = 1000;
  const pad = { top: 20, right: 24, bottom: 36, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const color = COLORS[metric] || COLORS.visitors;
  const values = data.map((d) => Number(d[metric]) || 0);
  const max = Math.max(...values, 1);
  const niceMax = max <= 4 ? max : Math.ceil(max / 4) * 4;

  const x = (i) =>
    pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / niceMax) * innerH;

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${pad.top + innerH} L${x(0)},${
    pad.top + innerH
  } Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const ratio = (px - pad.left) / innerW;
    const i = Math.round(ratio * (data.length - 1));
    if (i >= 0 && i < data.length) setHover(i);
  }

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`${metric} over time`}
      >
        <defs>
          <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.left - 12} y={y(t) + 4} className="chart-axis" textAnchor="end">
              {t}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#grad-${metric})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={pad.top}
            y2={pad.top + innerH}
            className="chart-crosshair"
          />
        )}

        {values.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={hover === i ? 5 : 3}
            fill="#fff"
            stroke={color}
            strokeWidth="2.5"
          />
        ))}

        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={d.bucket} x={x(i)} y={height - 10} className="chart-axis" textAnchor="middle">
              {formatBucket(d.bucket)}
            </text>
          ) : null
        )}
      </svg>

      {hover !== null && (
        <div
          className="chart-tooltip"
          style={{ left: `${(x(hover) / width) * 100}%`, top: `${(y(values[hover]) / height) * 100}%` }}
        >
          <strong>{formatBucket(data[hover].bucket)}</strong>
          <span>
            <i style={{ background: color }} />
            {metric}: {values[hover]}
          </span>
        </div>
      )}
    </div>
  );
}
