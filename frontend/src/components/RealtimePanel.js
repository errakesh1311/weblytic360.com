import Link from 'next/link';
import BreakdownTable from './BreakdownTable';

function MiniBars({ data = [] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.y), 1);

  return (
    <div className="minibars" aria-hidden="true">
      {data.map((d) => (
        <div key={d.bucket} className="minibar" title={`${d.label}: ${d.y}`}>
          <span style={{ height: `${Math.max((d.y / max) * 100, 2)}%` }} />
        </div>
      ))}
    </div>
  );
}

/** Dark "live right now" panel shown on the dashboard. */
export default function RealtimePanel({ active, siteId }) {
  const visitors = active?.visitors ?? 0;

  return (
    <section className="realtime-panel">
      <div className="realtime-head">
        <div>
          <h2>Active visitors in the last 5 minutes</h2>
          <p className="realtime-count">{visitors}</p>
        </div>
        {siteId && (
          <Link href={`/site/${siteId}/realtime`} className="btn btn-light">
            Real time data →
          </Link>
        )}
      </div>

      <div className="realtime-chart">
        <h3>Pageviews per minute</h3>
        <MiniBars data={active?.perMinute} />
        <div className="minibars-axis">
          <span>-30m</span>
          <span>-15m</span>
          <span>now</span>
        </div>
      </div>

      <div className="realtime-grid">
        <div>
          <h3>Main active pages</h3>
          <BreakdownTable
            rows={active?.pages}
            labelHeader="Page"
            valueHeader="Visitors"
            emptyText="No active visitors right now"
            limit={5}
          />
        </div>
        <div>
          <h3>Active countries</h3>
          <BreakdownTable
            rows={active?.countries}
            labelHeader="Country"
            valueHeader="Visitors"
            emptyText="No active visitors right now"
            limit={5}
          />
        </div>
      </div>
    </section>
  );
}
