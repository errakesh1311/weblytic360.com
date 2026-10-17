import { useEffect, useRef, useState } from 'react';

export const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 24 hours', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const iso = (d) => d.toISOString().slice(0, 10);

const fmt = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Resolves a range value into concrete API params. */
export function rangeToParams(range) {
  if (range?.start && range?.end) {
    return {
      start: new Date(`${range.start}T00:00:00`).toISOString(),
      end: new Date(`${range.end}T23:59:59`).toISOString(),
    };
  }
  return { days: range?.days ?? 7 };
}

/** Human label for the current selection. */
export function rangeLabel(range) {
  if (range?.start && range?.end) return `${fmt(range.start)} → ${fmt(range.end)}`;
  if (range?.days === 0) return 'Today';
  return PRESETS.find((p) => p.days === range?.days)?.label || `Last ${range?.days} days`;
}

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(value?.start || iso(new Date(Date.now() - 6 * 864e5)));
  const [end, setEnd] = useState(value?.end || iso(new Date()));
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const choosePreset = (days) => {
    onChange({ days });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!start || !end || start > end) return;
    onChange({ start, end });
    setOpen(false);
  };

  return (
    <div className="daterange" ref={ref}>
      <button
        type="button"
        className="daterange-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{rangeLabel(value)}</span>
        <span className="daterange-icon" aria-hidden="true">📅</span>
      </button>

      {open && (
        <div className="daterange-pop" role="dialog" aria-label="Choose a date range">
          <ul className="daterange-presets">
            {PRESETS.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  className={!value?.start && value?.days === p.days ? 'is-active' : ''}
                  onClick={() => choosePreset(p.days)}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="daterange-custom">
            <h4>Custom range</h4>
            <label>
              From
              <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={end} min={start} max={iso(new Date())} onChange={(e) => setEnd(e.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" onClick={applyCustom}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
