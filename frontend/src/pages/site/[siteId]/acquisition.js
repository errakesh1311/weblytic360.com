import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import PanelCard from '../../../components/PanelCard';
import BreakdownTable from '../../../components/BreakdownTable';
import AreaChart from '../../../components/charts/AreaChart';
import { rangeToParams } from '../../../components/DateRangePicker';
import api from '../../../lib/api';

/**
 * Sub-views map 1:1 to the Acquisition dropdown in the sidebar.
 * `type` is the backend metric type. Entry/exit pages use a dedicated
 * first/last-pageview-per-session endpoint; everything else is a metric
 * breakdown.
 */
const VIEWS = {
  entry: { title: 'Entry pages', label: 'Pathname', type: 'entry' },
  exit: { title: 'Exit pages', label: 'Pathname', type: 'exit' },
  utm_source: { title: 'UTM Source', label: 'UTM Source', type: 'utm_source' },
  utm_medium: { title: 'UTM Medium', label: 'UTM Medium', type: 'utm_medium' },
  utm_campaign: { title: 'UTM Campaign', label: 'UTM Campaign', type: 'utm_campaign' },
  utm_term: { title: 'UTM Term', label: 'UTM Term', type: 'utm_term' },
  utm_content: { title: 'UTM Content', label: 'UTM Content', type: 'utm_content' },
  referrer: { title: 'Referrer + Source', label: 'Source', type: 'referrer' },
};

const CHART_METRICS = [
  { key: 'pageviews', label: 'Pageviews' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'visitors', label: 'Users' },
];

const num = (n) => (n ?? 0).toLocaleString();

export default function AcquisitionPage() {
  const { query } = useRouter();
  const siteId = query.siteId;
  const view = VIEWS[query.view] ? query.view : 'referrer';
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
    setError(null);    const params = { ...rangeToParams(range), limit: 50 };

    const rowsPromise =
      active.type === 'entry' || active.type === 'exit'
        ? api.entryExitPages(siteId, active.type, params)
        : active.type
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
      title="Acquisition"
      siteId={siteId}
      siteName={site?.name}
      siteDomain={site?.domain}
      range={range}
      onRangeChange={setRange}
    >
      <div className="page-header">
        <h1 className="page-title">
          <span className="crumb-muted">Acquisition /</span>{' '}
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
                <th className="num">Pageviews</th>
                <th className="num">Users</th>
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
