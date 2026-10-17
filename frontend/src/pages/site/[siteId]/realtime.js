import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import PanelCard from '../../../components/PanelCard';
import BreakdownTable from '../../../components/BreakdownTable';
import LiveChart from '../../../components/charts/LiveChart';
import api from '../../../lib/api';

/** Sub-views shown as tabs, matching the Publytics Real Time section. */
const VIEWS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'content', label: 'Content', icon: '📄' },
  { key: 'sources', label: 'Sources', icon: '🔗' },
  { key: 'country', label: 'Country', icon: '🌍' },
  { key: 'events', label: 'Events', icon: '🎯' },
  { key: 'trends', label: 'Trends', icon: '📈' },
];

const WINDOWS = [
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
];

export default function RealTime() {
  const router = useRouter();
  const { siteId } = router.query;

  const [site, setSite] = useState(null);
  const [minutes, setMinutes] = useState(5);
  const [live, setLive] = useState(null);
  const [error, setError] = useState(null);
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;

  // The active sub-view is driven by the URL (?view=), set from the sidebar.
  const view = VIEWS.some((v) => v.key === router.query.view)
    ? router.query.view
    : 'overview';
  const setView = (key) =>
    router.push({ pathname: router.pathname, query: { siteId, view: key } }, undefined, {
      shallow: true,
    });

  useEffect(() => {
    if (!siteId) return;
    api.getSite(siteId).then(setSite).catch((e) => setError(e.message));
  }, [siteId]);

  // Poll the live endpoint every 10s (and immediately on window change).
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    const tick = () =>
      api
        .active(siteId, { minutes: minutesRef.current })
        .then((d) => !cancelled && setLive(d))
        .catch(() => {});
    tick();
    const id = setInterval(tick, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [siteId, minutes]);

  const visitors = live?.visitors ?? 0;

  return (
    <Layout
      title="Real Time"
      siteId={siteId}
      siteName={site?.name}
      siteDomain={site?.domain}
      liveCount={visitors}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="rt-pulse" aria-hidden="true" /> Real Time
          </h1>
          <p className="page-subtitle">Live activity on {site?.domain || 'your site'}</p>
        </div>
        <label className="rt-window">
          <span>Window</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <nav className="rt-tabs">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            className={`rt-tab ${view === v.key ? 'active' : ''}`}
            onClick={() => setView(v.key)}
          >
            <span aria-hidden="true">{v.icon}</span> {v.label}
          </button>
        ))}
      </nav>

      {view === 'overview' && <OverviewView live={live} minutes={minutes} />}
      {view === 'content' && (
        <SingleBreakdown title="Active pages" icon="📄" rows={live?.pages} labelHeader="Page" minutes={minutes} />
      )}
      {view === 'sources' && (
        <SingleBreakdown title="Active referral sources" icon="🔗" rows={live?.sources} labelHeader="Source" minutes={minutes} />
      )}
      {view === 'country' && (
        <SingleBreakdown title="Active countries" icon="🌍" rows={live?.countries} labelHeader="Country" minutes={minutes} />
      )}
      {view === 'events' && (
        <SingleBreakdown title="Live events" icon="🎯" rows={live?.events} labelHeader="Event" valueHeader="Count" minutes={minutes} />
      )}
      {view === 'trends' && <TrendsView live={live} />}
    </Layout>
  );
}

/* ---------------------------------------------------------------- */

function ActiveCard({ visitors, minutes }) {
  return (
    <div className="rt-active-card">
      <p className="rt-active-label">
        In the last {minutes} minute{minutes === 1 ? '' : 's'}
      </p>
      <p className="rt-active-number">{visitors.toLocaleString()}</p>
      <p className="rt-active-sub">👥 Active Users</p>
      <div className="rt-active-pulsebar" aria-hidden="true">
        <span style={{ width: `${Math.min(visitors * 8, 100)}%` }} />
      </div>
    </div>
  );
}

function OverviewView({ live, minutes }) {
  const visitors = live?.visitors ?? 0;

  // Dimension switcher for the main breakdown table (Publytics-style pills).
  const DIMENSIONS = [
    { key: 'pages', label: 'Pathname', header: 'Pathname' },
    { key: 'devices', label: 'Device', header: 'Device' },
    { key: 'sources', label: 'Referrer + Source', header: 'Source' },
    { key: 'countries', label: 'Country', header: 'Country' },
    { key: 'browsers', label: 'Browser', header: 'Browser' },
  ];
  const [dim, setDim] = useState('pages');
  const activeDim = DIMENSIONS.find((d) => d.key === dim) || DIMENSIONS[0];

  return (
    <>
      <div className="rt-overview-top">
        <ActiveCard visitors={visitors} minutes={minutes} />

        <section className="card rt-chart-card">
          <h3 className="rt-chart-title">Pageviews — Last 30 minutes</h3>
          <LiveChart data={live?.perMinute || []} height={180} />
        </section>

        <section className="panel-card rt-chart-card rt-chart-card--dark">
          <header className="panel-card__head">
            <span className="panel-card__title">Pageviews — Last minute</span>
          </header>
          <div className="panel-card__body">
            <LiveChart data={live?.perSecond || []} dark height={180} />
          </div>
        </section>
      </div>

      <div className="rt-overview-main">
        {/* Left: dimension pills + main breakdown */}
        <div>
          <div className="rt-dim-pills">
            {DIMENSIONS.map((d) => (
              <button
                key={d.key}
                className={`rt-dim-pill ${dim === d.key ? 'active' : ''}`}
                onClick={() => setDim(d.key)}
              >
                {dim === d.key && <span className="rt-dim-dot" aria-hidden="true" />}
                {d.label}
              </button>
            ))}
          </div>

          <PanelCard title={activeDim.header} rightLabel="Active Users">
            <BreakdownTable
              rows={live?.[dim]}
              labelHeader={activeDim.header}
              valueHeader="Active Users"
              emptyText="No data available"
              limit={15}
            />
          </PanelCard>
        </div>

        {/* Right rail: stacked live source/country panels */}
        <div className="rt-overview-rail">
          <PanelCard title="Referral Sources" rightLabel="Active Users">
            <BreakdownTable
              rows={live?.sources}
              labelHeader="Source"
              valueHeader="Active Users"
              emptyText="No data available"
              limit={6}
            />
          </PanelCard>
          <PanelCard title="Top Countries — Last 5 minutes" rightLabel="Active Users">
            <BreakdownTable
              rows={live?.countries}
              labelHeader="Country"
              valueHeader="Active Users"
              emptyText="No data available"
              limit={6}
            />
          </PanelCard>
        </div>
      </div>
    </>
  );
}

function SingleBreakdown({ title, icon, rows, labelHeader, valueHeader = 'Visitors', minutes }) {
  const total = (rows || []).reduce((s, r) => s + r.y, 0);
  return (
    <div className="rt-single">
      <PanelCard title={title} icon={icon} rightLabel={`${total.toLocaleString()} in last ${minutes}m`}>
        <BreakdownTable rows={rows} labelHeader={labelHeader} valueHeader={valueHeader} emptyText="No data available" limit={30} />
      </PanelCard>
    </div>
  );
}

function TrendsView({ live }) {
  return (
    <div className="dash-grid-2">
      <section className="card rt-chart-card">
        <h3 className="rt-chart-title">Pageviews — Last 30 minutes</h3>
        <LiveChart data={live?.perMinute || []} height={200} />
      </section>
      <section className="panel-card rt-chart-card rt-chart-card--dark">
        <header className="panel-card__head">
          <span className="panel-card__title">Pageviews — Last minute</span>
        </header>
        <div className="panel-card__body">
          <LiveChart data={live?.perSecond || []} dark height={200} />
        </div>
      </section>
    </div>
  );
}