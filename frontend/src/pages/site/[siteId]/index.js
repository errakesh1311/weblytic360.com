import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import MetricTabs from '../../../components/MetricTabs';
import AreaChart from '../../../components/charts/AreaChart';
import BreakdownTable from '../../../components/BreakdownTable';
import PanelCard from '../../../components/PanelCard';
import DonutChart from '../../../components/DonutChart';
import WorldMap from '../../../components/WorldMap';
import RealtimePanel from '../../../components/RealtimePanel';
import { rangeLabel } from '../../../components/DateRangePicker';
import api from '../../../lib/api';
import { useSiteData } from '../../../lib/useSiteData';

const fmtDuration = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const num = (n) => (n ?? 0).toLocaleString();

/** Short ranges read better by hour, longer ones by day. */
const autoUnit = (range) => {
  if (range?.start && range?.end) {
    const spanDays = (new Date(range.end) - new Date(range.start)) / 864e5;
    return spanDays <= 2 ? 'hour' : 'day';
  }
  return range?.days <= 1 ? 'hour' : 'day';
};

export default function SiteDashboard() {
  const [metric, setMetric] = useState('visitors');
  const [unit, setUnit] = useState(null); // null = choose automatically

  const { site, data, range, setRange, error, loading } = useSiteData(
    (siteId, params) => api.siteStats(siteId, { ...params, unit: unit || autoUnit(range) }),
    [unit]
  );

  // Keep the realtime panel fresh without refetching the whole dashboard.
  const [live, setLive] = useState(null);
  useEffect(() => {
    if (!site?.id) return;
    let cancelled = false;
    const tick = () =>
      api
        .active(site.id)
        .then((d) => !cancelled && setLive(d))
        .catch(() => {});
    tick();
    const id = setInterval(tick, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [site?.id]);

  const o = data?.overview;
  const active = live || data?.active;

  const tabs = o
    ? [
        { key: 'visitors', label: 'Users', value: num(o.visitors), metric: 'visitors', change: o.change.visitors },
        { key: 'sessions', label: 'Sessions', value: num(o.sessions), metric: 'sessions', change: o.change.sessions },
        { key: 'pageviews', label: 'Pageviews', value: num(o.pageviews), metric: 'pageviews', change: o.change.pageviews },
        { key: 'bounce', label: 'Bounce rate', value: `${o.bounceRate}%`, change: o.change.bounceRate },
        { key: 'duration', label: 'Session duration', value: fmtDuration(o.avgDuration) },
      ]
    : [];

  return (
    <Layout
      title={site?.name || 'Dashboard'}
      siteId={site?.id}
      siteName={site?.name}
      siteDomain={site?.domain}
      range={range}
      onRangeChange={setRange}
      liveCount={active?.visitors}
    >
      <div className="page-header">
        <h1>Dashboard</h1>
        <span className="page-subtitle">{rangeLabel(range)}</span>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && !data && <p className="muted">Loading analytics…</p>}

      {o && (
        <>
          <MetricTabs tabs={tabs} active={metric} onSelect={setMetric} />

          <section className="card">
            <div className="card-head">
              <h2 className="chart-title">{metric}</h2>
              <label className="granularity">
                Granularity
                <select
                  value={unit || autoUnit(range)}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="day">day</option>
                  <option value="hour">hour</option>
                </select>
              </label>
            </div>
            <AreaChart data={data.timeseries} metric={metric} />
          </section>

          <RealtimePanel active={active} siteId={site?.id} />

          {/* Publytics-style panel row: Top pages · Devices · Referrers */}
          <div className="dash-grid-3">
            <PanelCard
              icon="📄"
              title="Top Pages"
              rightLabel="Pageviews"
              viewAllHref={`/site/${site?.id}/content`}
              viewAllText="View all Pages"
            >
              <BreakdownTable
                rows={data.pages}
                labelHeader="Page"
                valueHeader="Pageviews"
                limit={6}
              />
            </PanelCard>

            <PanelCard
              title="Devices (Users)"
              icon="📱"
              viewAllHref={`/site/${site?.id}/audience`}
              viewAllText="View all Audience Devices"
            >
              <DonutChart rows={data.devices} />
            </PanelCard>

            <PanelCard
              icon="🔗"
              title="Referrer + Source"
              rightLabel="Pageviews"
              viewAllHref={`/site/${site?.id}/acquisition`}
              viewAllText="View all Referrer + Source"
            >
              <BreakdownTable
                rows={data.referrers}
                labelHeader="Source"
                valueHeader="Pageviews"
                limit={6}
              />
            </PanelCard>
          </div>

          {/* World map + Country breakdown — Publytics style */}
          <div className="dash-map-row">
            <section className="worldmap-card">
              <span className="worldmap-card__badge">
                Active users: {rangeLabel(range)}
              </span>
              <WorldMap rows={data.countries} />
            </section>

            <PanelCard
              icon="🌐"
              title="Country"
              rightLabel="Users"
              viewAllHref={`/site/${site?.id}/audience`}
              viewAllText="View all Countries"
            >
              <BreakdownTable
                rows={data.countries}
                labelHeader="Country"
                valueHeader="Users"
                emptyText="No Traffic Detected"
                limit={8}
              />
            </PanelCard>
          </div>

          {/* Browsers */}
          <div className="dash-grid-2">
            <PanelCard
              icon="🔍"
              title="Browsers"
              rightLabel="Pageviews"
              viewAllHref={`/site/${site?.id}/audience`}
              viewAllText="View all Browsers"
            >
              <BreakdownTable
                rows={data.browsers}
                labelHeader="Browser"
                valueHeader="Pageviews"
                limit={6}
              />
            </PanelCard>
          </div>

          {/* Events · Custom Dimensions */}
          <div className="dash-grid-2">
            <PanelCard
              icon="📡"
              title="Events"
              rightLabel="Hits"
              viewAllHref={`/site/${site?.id}/events`}
              viewAllText="View all Events"
            >
              <BreakdownTable
                rows={data.events}
                labelHeader="Event"
                valueHeader="Hits"
                emptyText="No Traffic Detected"
                limit={6}
              />
            </PanelCard>

            <PanelCard
              icon="📦"
              title="Custom Dimensions"
              rightLabel="Pageviews"
            >
              <BreakdownTable
                rows={[]}
                labelHeader="Dimension"
                valueHeader="Pageviews"
                emptyText="No Traffic Detected"
                limit={6}
              />
            </PanelCard>
          </div>
        </>
      )}
    </Layout>
  );
}