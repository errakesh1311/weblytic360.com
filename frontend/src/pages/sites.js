import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

export default function SitesPage() {
  const { ready } = useAuth();
  const [sites, setSites] = useState([]);
  const [usage, setUsage] = useState(null);
  const [form, setForm] = useState({ name: '', domain: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    Promise.all([api.listSites(), api.usage()])
      .then(([s, u]) => {
        setSites(s);
        setUsage(u);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ready]);

  const addSite = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const site = await api.createSite(form);
      setSites([site, ...sites]);
      setForm({ name: '', domain: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout title="Your sites">
      <div className="page-header">
        <h1>Your sites</h1>
        {usage && (
          <span className="plan-pill">
            {usage.plan.name} · {usage.usage.events.toLocaleString()} /{' '}
            {usage.usage.eventLimit.toLocaleString()} events
          </span>
        )}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="site-grid">
          {sites.map((site) => (
            <Link key={site.id} href={`/site/${site.id}`} className="site-card">
              <div className="site-card-name">{site.name}</div>
              <div className="site-card-domain">{site.domain}</div>
            </Link>
          ))}

          {!sites.length && (
            <p className="muted">No sites yet — add your first one below.</p>
          )}
        </div>
      )}

      <section className="card">
        <h2>Add a site</h2>
        <form onSubmit={addSite} className="inline-form">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Site name"
            required
          />
          <input
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            placeholder="example.com"
            required
          />
          <button type="submit" className="btn-primary">
            Add site
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>
    </Layout>
  );
}
