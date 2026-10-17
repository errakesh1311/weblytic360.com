import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { rangeToParams, PRESETS } from '../components/DateRangePicker';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

const fmtDuration = (s) => {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
};

export default function NetworkPage() {
  const { ready } = useAuth();
  const [range, setRange] = useState(PRESETS[2]); // Last 7 days
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    api
      .network(rangeToParams(range))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ready, range]);

  const totals = data?.totals;

  return (
    <Layout title="Network" range={range} onRangeChange={setRange}>
      <div className="page-header">
        <h1>Network overview</h1>
        {data && (
          <span className="plan-pill">
            {data.siteCount} site{data.siteCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
/
      {error && <p className="form-error">{error}</p>}
      {loading && !data && <p className="muted">Loading…</p>}
/
      {totals && (
        <>
          <div className="stat-grid">
            <StatCard label="Visitors" value={totals.visitors} />
            <StatCard label="Pageviews" value={totals.pageviews} />
            <StatCard label="Sessions" value={totals.sessions} />
            <StatCard label="Bounce rate" value={totals.bounceRate} suffix="%" />
            <StatCard label="Online now" value={totals.live} />
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Sites</h2>
            </div>

            {data.sites.length === 0 ? (
              <p className="muted">
                No sites yet. <Link href="/sites">Add your first site</Link>.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th className="num">Visitors</th>
                    <th className="num">Pageviews</th>
                    <th className="num">Sessions</th>
                    <th className="num">Bounce</th>
                    <th className="num">Avg. time</th>
                    <th className="num">Live</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sites.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/site/${s.id}`} className="table-link">
                          <strong>{s.name}</strong>
                          <small>{s.domain}</small>
                        </Link>
                      </td>
                      <td className="num">{s.visitors.toLocaleString()}</td>
                      <td className="num">{s.pageviews.toLocaleString()}</td>
                      <td className="num">{s.sessions.toLocaleString()}</td>
                      <td className="num">{s.bounceRate}%</td>
                      <td className="num">{fmtDuration(s.avgDuration)}</td>
                      <td className="num">
                        {s.live > 0 ? (
                          <span className="live-badge live-badge--sm">
                            <span className="live-dot" />
                            {s.live}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
