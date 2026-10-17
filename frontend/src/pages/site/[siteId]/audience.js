import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import PanelCard from '../../../components/PanelCard';
import BreakdownTable from '../../../components/BreakdownTable';
import AreaChart from '../../../components/charts/AreaChart';
import { rangeToParams } from '../../../components/DateRangePicker';
import api from '../../../lib/api';

/** Sub-views that map 1:1 to the Audience dropdown in the sidebar. */
const VIEWS = {
  device: { title: 'Device', type: 'device', label: 'Device' },
  country: { title: 'Country', type: 'country', label: 'Country' },
  os: { title: 'Operating System', type: 'os', label: 'Operating System' },
  browser: { title: 'Browser', type: 'browser', label: 'Browser' },
  hostname: { title: 'Hostname', type: 'hostname', label: 'Hostname' },
};

const CHART_METRICS = [
  { key: 'pageviews', label: 'Pageviews' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'visitors', label: 'Users' },
];

const fmtDuration = (s = 0) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
};
const num = (n) => (n ?? 0).toLocaleString();

export default function AudiencePage() {
  const { query } = useRouter();
  const siteId = query.siteId;
  const view = query.view || 'overview';

  const [site, setSite] = useState(null);
  const [range, setRange] = useState({ days: 7 });
  const [overview, setOverview] = useState(null);
  const [series, setSeries] = useState([]);
  const [breakdowns, setBreakdowns] = useState({});
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
    const params = { ...rangeToParams(range), limit: 15 };

    Promise.all([
      api.overview(siteId, params),
      api.timeseries(siteId, params),
      api.metrics(siteId, 'country', params),
      api.metrics(siteId, 'device', params),
      api.metrics(siteId, 'browser', params),
      api.metrics(siteId, 'os', params),
      api.metrics(siteId, 'hostname', params),
    ])
      .then(([ov, ts, country, device, browser, os, hostname]) => {
        setOverview(ov);
        setSeries(ts);
        setBreakdowns({ country, device, browser, os, hostname });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, range.days, range.start, range.end]);

  const crumb = view === 'overview' ? 'Overview' : VIEWS[view]?.title || 'Overview';

  return (
    <Layout
      title="Audience"
      siteId={siteId}
      siteName={site?.name}
      siteDomain={site?.domain}
      range={range}
      onRangeChange={setRange}
    >
      <div className="page-header">
        <h1 className="page-title">
          <span className="crumb-muted">Audience /</span>{' '}
          <span className="crumb-link">{crumb}</span>
        </h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {view === 'overview' ? (
        <AudienceOverview overview={overview} breakdowns={breakdowns} loading={loading} />
      ) : (
        <AudienceReport
          view={VIEWS[view] || VIEWS.device}
          rows={breakdowns[view] || []}
          series={series}
          metric={metric}
          setMetric={setMetric}
          loading={loading}
        />
      )}
    </Layout>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function KpiTile({ label, value }) {
  return (
    <div className="aud-kpi">
      <span className="aud-kpi-label">{label}</span>
      <span className="aud-kpi-value">{value}</span>
    </div>
  );
}

const DEMOGRAPHIC = [
  { key: 'country', label: 'Country' },
  { key: 'hostname', label: 'Hostname' },
];
const SYSTEM = [
  { key: 'browser', label: 'Browser' },
  { key: 'os', label: 'Operating System' },
  { key: 'device', label: 'Devices' },
];

function AudienceOverview({ overview, breakdowns, loading }) {
  const [dim, setDim] = useState('country');
  const o = overview || {};
  const sessionsPerUser = o.visitors ? (o.sessions / o.visitors).toFixed(2) : 'N/A';
  const pvPerSession = o.sessions ? (o.pageviews / o.sessions).toFixed(2) : 'N/A';
  const activeLabel =
    [...DEMOGRAPHIC, ...SYSTEM].find((d) => d.key === dim)?.label || 'Country';

  return (
    <>
      <div className="aud-hero-row">
        <div className="aud-hero">
          <span className="aud-hero-label">Users</span>
          <span className="aud-hero-value">{loading ? '…' : num(o.visitors)}</span>
        </div>

        <div className="aud-kpi-grid">
          <KpiTile label="Sessions" value={num(o.sessions)} />
          <KpiTile label="Pageviews" value={num(o.pageviews)} />
          <KpiTile label="Bounce rate" value={`${o.bounceRate ?? 0}%`} />
          <KpiTile label="Sessions per User" value={sessionsPerUser} />
          <KpiTile label="Pageviews per Session" value={pvPerSession} />
          <KpiTile label="Session Duration" value={fmtDuration(o.avgDuration)} />
        </div>
      </div>

      <div className="aud-overview-main">
        <div className="aud-selector">
          <div className="aud-selector-group-title">Demographic data</div>
          {DEMOGRAPHIC.map((d) => (
            <button
              key={d.key}
              className={`aud-selector-item ${dim === d.key ? 'active' : ''}`}
              onClick={() => setDim(d.key)}
            >
              {d.label} <span aria-hidden="true">›</span>
            </button>
          ))}
          <div className="aud-selector-group-title">System</div>
          {SYSTEM.map((d) => (
            <button
              key={d.key}
              className={`aud-selector-item ${dim === d.key ? 'active' : ''}`}
              onClick={() => setDim(d.key)}
            >
              {d.label} <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>

        <PanelCard title={activeLabel} rightLabel="Users">
          <BreakdownTable
            rows={breakdowns[dim] || []}
            labelHeader={activeLabel}
            valueHeader="Users"
            emptyText="No data available"
            limit={15}
          />
        </PanelCard>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Per-dimension report (Device / Country / OS / Browser / Hostname)  */
/* ------------------------------------------------------------------ */

function AudienceReport({ view, rows, series, metric, setMetric, loading }) {
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({ y: acc.y + r.y, v: acc.v + (r.visitors || 0) }),
        { y: 0, v: 0 }
      ),
    [rows]
  );

  const METRIC_CHIPS = ['Pageviews', 'Sessions', 'Users', 'Avg. Session Duration', 'Bounce Rate'];

  return (
    <>
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

      {/* Report tab marker */}
      <div className="aud-report-tabbar">
        <span className="aud-report-tab active">Report</span>
      </div>

      <section className="aud-report">
        {/* Navy header: primary dimension + export actions */}
        <header className="aud-report-head">
          <span className="aud-report-dim">Primary Dimension: {view.title}</span>
          <div className="aud-report-actions">
            <button className="aud-report-btn">⬇ CSV</button>
            <button className="aud-report-btn">⬇ PDF</button>
            <button className="aud-report-btn">🔖 Report</button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="aud-report-toolbar">
          <div className="aud-report-toolbar-left">
            <button className="aud-report-pill">➕ Dimensions ▾</button>
            <button className="aud-report-pill">➕ Metrics ▾</button>
          </div>
          <div className="aud-report-toolbar-right">
            <div className="aud-report-search">
              <input placeholder={`${view.label}…`} />
              <button aria-label="Search">🔍</button>
            </div>
            <button className="aud-report-pill aud-report-pill--outline">▽ Filters</button>
          </div>
        </div>

        {/* Active metrics chips */}
        <div className="aud-report-active">
          <span className="aud-report-active-label">Active Metrics</span>
          <div className="aud-report-chips">
            {METRIC_CHIPS.map((m) => (
              <span key={m} className="aud-report-chip">
                {m} <b aria-hidden="true">×</b>
              </span>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="aud-report-tablewrap">
          <table className="aud-report-grid">
            <thead>
              <tr>
                <th>{view.label.toUpperCase()}</th>
                <th className="num">Pageviews</th>
                <th className="num">Sessions</th>
                <th className="num">Users</th>
                <th className="num">Avg. Session Duration</th>
                <th className="num">Bounce Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr className="aud-report-summary">
                <td>Total results: {rows.length}</td>
                <td className="num">{num(totals.y)}</td>
                <td className="num">{num(totals.y)}</td>
                <td className="num">{num(totals.v)}</td>
                <td className="num">00:00:00</td>
                <td className="num">0.00 %</td>
              </tr>
            </tbody>
          </table>

          {loading ? (
            <p className="aud-report-empty">Loading…</p>
          ) : rows.length ? (
            <table className="aud-report-grid aud-report-grid--body">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.x}>
                    <td>
                      <span className="breakdown-name" title={r.x}>
                        {r.x}
                      </span>
                    </td>
                    <td className="num">{num(r.y)}</td>
                    <td className="num">{num(r.y)}</td>
                    <td className="num">{num(r.visitors)}</td>
                    <td className="num">00:00:00</td>
                    <td className="num">{r.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="aud-report-empty">No data available</p>
          )}
        </div>

        {/* Pagination footer */}
        <footer className="aud-report-foot">
          <span className="aud-report-page">1</span>
          <div className="aud-report-perpage">
            <span>Entries per page</span>
            <select defaultValue="20">
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </footer>
      </section>
    </>
  );
}
