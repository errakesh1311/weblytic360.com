/**
 * Thin SVG bar/area chart for the Real Time views. Renders a zero-filled
 * series ({ label, y }) with a soft gradient fill and a baseline grid.
 * `dark` flips the palette for the navy "Last minute" panel.
 */
export default function LiveChart({ data = [], dark = false, height = 160, ticks = [] }) {
  const max = Math.max(...data.map((d) => d.y), 1);
  const stroke = dark ? '#5eead4' : '#2563eb';
  const fill = dark ? 'rgba(94,234,212,.18)' : 'rgba(37,99,235,.12)';
  const grid = dark ? 'rgba(255,255,255,.12)' : 'rgba(15,23,42,.08)';
  const axis = dark ? 'rgba(255,255,255,.55)' : 'var(--text-muted, #64748b)';

  const W = 800;
  const H = height;
  const pad = { top: 8, bottom: 20, left: 4, right: 4 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const n = data.length || 1;

  const x = (i) => pad.left + (i / (n - 1 || 1)) * innerW;
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.y)}`).join(' ');
  const area = `${line} L${x(n - 1)},${pad.top + innerH} L${x(0)},${pad.top + innerH} Z`;

  // Horizontal gridlines at 0, 25, 50, 75, 100% of max.
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => pad.top + innerH - f * innerH);

  // Axis labels evenly sampled from the series.
  const labelTicks =
    ticks.length > 0
      ? ticks
      : data
          .map((d, i) => ({ i, label: d.label }))
          .filter((_, i) => i % Math.ceil(n / 6) === 0 || i === n - 1);

  return (
    <svg
      className="live-chart"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Realtime pageviews chart"
    >
      {gridLines.map((gy, i) => (
        <line key={i} x1={pad.left} y1={gy} x2={W - pad.right} y2={gy} stroke={grid} strokeWidth="1" />
      ))}

      {max > 0 && data.some((d) => d.y > 0) ? (
        <>
          <path d={area} fill={fill} />
          <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </>
      ) : null}

      {labelTicks.map((t) => (
        <text
          key={t.i}
          x={x(t.i)}
          y={H - 6}
          fontSize="11"
          fill={axis}
          textAnchor={t.i === 0 ? 'start' : t.i === n - 1 ? 'end' : 'middle'}
        >
          {t.label}
        </text>
      ))}
    </svg>
  );
}
