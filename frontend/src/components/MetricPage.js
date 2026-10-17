import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from './Layout';
import BreakdownTable from './BreakdownTable';
import { rangeToParams } from './DateRangePicker';
import api from '../lib/api';

/**
 * Renders a grid of top-N breakdowns for the given dimensions.
 * panels: [{ type, title, label }]
 */
export default function MetricPage({ title, panels }) {
  const { query } = useRouter();
  const siteId = query.siteId;
  const view = query.view || 'overview';
  const [site, setSite] = useState(null);
  const [range, setRange] = useState({ days: 7 });
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // When a sub-view is selected, show only that panel; otherwise show all.
  const visiblePanels =
    view === 'overview' ? panels : panels.filter((p) => p.view === view);
  const activePanels = visiblePanels.length ? visiblePanels : panels;

  useEffect(() => {
    if (!siteId) return;
    api.getSite(siteId).then(setSite).catch((e) => setError(e.message));
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    setError(null);

    const params = { ...rangeToParams(range), limit: 15 };

    Promise.all(panels.map((p) => api.metrics(siteId, p.type, params)))
      .then((lists) => {
        const next = {};
        panels.forEach((p, i) => (next[p.type] = lists[i]));
        setResults(next);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, range.days, range.start, range.end]);

  return (
    <Layout
      title={title}
      siteId={siteId}
      siteName={site?.name}
      siteDomain={site?.domain}
      range={range}
      onRangeChange={setRange}
    >
      <div className="page-header">
        <h1>{title}</h1>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}      <div className="card-grid">
        {activePanels.map((p) => (
          <section key={p.type} className="card">
            <h2>{p.title}</h2>
            <BreakdownTable
              rows={results[p.type] || []}
              labelHeader={p.label || p.title}
              valueHeader={p.value || 'Pageviews'}
            />
          </section>
        ))}
      </div>
    </Layout>
  );
}
