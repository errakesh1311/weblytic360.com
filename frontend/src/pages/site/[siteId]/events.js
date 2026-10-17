import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import PanelCard from '../../../components/PanelCard';
import AreaChart from '../../../components/charts/AreaChart';
import { rangeToParams } from '../../../components/DateRangePicker';
import api from '../../../lib/api';

/**
 * Sub-views map 1:1 to the Events dropdown in the sidebar.
 * `type` is the backend metric type; views without a data source yet
 * (Google Quality Raters) render a graceful empty state.
 */
const VIEWS = {
  overview: { title: 'Event Name', label: 'Event Name', type: 'event' },
  pages: { title: 'Page Overview', label: 'Pathname', type: 'url' },
  raters: { title: 'Google Quality Raters', label: 'Rater', type: null },
};

const CHART_METRICS = [
  { key: 'pageviews', label: 'Hits' },
  { key: 'sessions', label: 'Session Hits' },
  { key: 'visitors', label: 'Unique Hits' },
];

const num = (n) => (n ?? 0).toLocaleString();

export default function EventsPage() {
  const { query } = useRouter();
  const siteId = query.siteId;
  const view = VIEWS[query.view] ? query.view : 'overview';
  const active = VIEWS[view];

  const [site, setSite] = useState(null);
  const [range, setRange] = useState({ days: 7 });
  const [rows, setRows] = useState([]);
  const [series, setSeries] = useState([]);
  const [metric, setMetric] = useState('pageviews');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) return;
    api.getSite(siteId).then(setSite).catch((e) => setError(e.message));
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    const params = { ...rangeToParams(range), limit: 50 };

    const rowsPromise = active.type
      ? api.metrics(siteId, active.type, params)
      : Promise.resolve([]);

    Promise.all([rowsPromise, api.timeseries(siteId, params)])
      .then(([r, ts]) => {
        setRows(r);
        setSeries(ts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, view, range.days, range.start, range.end]);

  const totals = rows.reduce(
    (acc, r) => ({ y: acc.y + r.y, v: acc.v + (r.visitors || 0) }),
    { y: 0, v: 0 }
  );

  return (
    <Layout
      title="Events"
      siteId={siteId}
      siteName={site?.name}
      siteDomain={site?.domain}
      range={range}
      onRangeChange={setRange}
    >
      <div className="page-header">
        <h1 className="page-title">
          <span className="crumb-muted">Events /</span>{' '}
          <span className="crumb-link">{active.title}</span>
        </h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="card">
        <div className="card-head">
          <h2>Historical</h2>
        </div>
        <AreaChart data={series} metric={metric} height={280} />
        <div className="aud-metric-pills">
          {CHART_METRICS.map((m) => (
            <button
              key={m.key}
              className={`aud-metric-pill ${metric === m.key ? 'active' : ''}`}
              onClick={() => setMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <PanelCard
        title={`Primary Dimension: ${active.title}`}
        rightLabel={`Total results: ${rows.length}`}
      >
        {loading ? (
          <p className="muted" style={{ padding: 16 }}>
            Loading…
          </p>
        ) : rows.length ? (
          <table className="breakdown aud-report-table">
            <thead>
              <tr>
                <th>{active.label}</th>
                <th className="num">Hits</th>
                <th className="num">Unique Hits</th>
                <th className="num">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.x}>
                  <td>
                    <span className="breakdown-name" title={r.x}>
                      {r.x}
                    </span>
                  </td>
                  <td className="num">
                    <strong>{num(r.y)}</strong>
                  </td>
                  <td className="num">{num(r.visitors)}</td>
                  <td className="num">{r.percent}%</td>
                </tr>
              ))}
              <tr className="aud-report-total">
                <td>
                  <strong>Total results: {rows.length}</strong>
                </td>
                <td className="num">
                  <strong>{num(totals.y)}</strong>
                </td>
                <td className="num">
                  <strong>{num(totals.v)}</strong>
                </td>
                <td className="num">100%</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="breakdown-empty-state">
            <span className="breakdown-empty-icon" aria-hidden="true">
              📡
            </span>
            <p>No data available</p>
          </div>
        )}
      </PanelCard>
    </Layout>
  );
}
