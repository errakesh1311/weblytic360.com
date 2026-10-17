import { useState } from 'react';
import Layout from '../../../components/Layout';
import StatCard from '../../../components/StatCard';
import BreakdownTable from '../../../components/BreakdownTable';
import AreaChart from '../../../components/charts/AreaChart';
import useSiteData from '../../../lib/useSiteData';
import api from '../../../lib/api';

const SERIES = [
  { key: 'y', label: 'All AI hits' },
  { key: 'referrals', label: 'Assistant referrals' },
  { key: 'crawls', label: 'Crawler hits' },
];

export default function AiTrafficPage() {
  const { siteId, site, data, range, setRange, error, loading } = useSiteData((id, params) =>
    api.aiTraffic(id, params)
  );
  const [metric, setMetric] = useState('y');

  const totals = data?.totals || { hits: 0, visitors: 0, referrals: 0, crawls: 0 };
  const change = data?.change || {};

  return (
    <Layout
      title="AI Traffic"
      siteId={siteId}
      siteName={site?.name}
      siteDomain={site?.domain}
      range={range}
      onRangeChange={setRange}
    >
      <div className="page-header">
        <h1>AI Traffic</h1>
        <p className="muted">
          Visits sent by AI assistants, and requests made by AI crawlers that index your
          content for those answers.
        </p>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="stat-grid">
        <StatCard label="Total AI hits" value={totals.hits} change={change.hits} />
        <StatCard label="AI visitors" value={totals.visitors} change={change.visitors} />
        <StatCard label="Assistant referrals" value={totals.referrals} change={change.referrals} />
        <StatCard label="Crawler hits" value={totals.crawls} change={change.crawls} />
        <StatCard label="Share of all traffic" value={data?.share ?? 0} suffix="%" />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>AI traffic over time</h2>
          <div className="seg-group">
            {SERIES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`seg ${metric === s.key ? 'active' : ''}`}
                onClick={() => setMetric(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <AreaChart data={data?.series || []} metric={metric} />
      </section>

      <div className="card-grid">
        <section className="card">
          <h2>AI assistants sending visitors</h2>
          <BreakdownTable
            rows={data?.assistants || []}
            labelHeader="Assistant"
            valueHeader="Visits"
            emptyText="No AI referrals in this period"
          />
        </section>

        <section className="card">
          <h2>AI crawlers</h2>
          <BreakdownTable
            rows={data?.crawlers || []}
            labelHeader="Crawler"
            valueHeader="Requests"
            emptyText="No AI crawler activity in this period"
          />
        </section>

        <section className="card">
          <h2>By vendor</h2>
          <BreakdownTable
            rows={data?.vendors || []}
            labelHeader="Vendor"
            valueHeader="Hits"
            emptyText="No AI traffic in this period"
          />
        </section>

        <section className="card">
          <h2>Most cited pages</h2>
          <BreakdownTable
            rows={data?.pages || []}
            labelHeader="Page"
            valueHeader="Hits"
            emptyText="No AI traffic in this period"
          />
        </section>
      </div>
    </Layout>
  );
}
