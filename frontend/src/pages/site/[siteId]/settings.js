import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';

export default function Settings() {
  const router = useRouter();
  const siteId = router.query.siteId;

  const [site, setSite] = useState(null);
  const [form, setForm] = useState({ name: '', domain: '', timezone: 'UTC' });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    api
      .getSite(siteId)
      .then((s) => {
        setSite(s);
        setForm({ name: s.name, domain: s.domain, timezone: s.timezone || 'UTC' });
      })
      .catch((e) => setError(e.message));
  }, [siteId]);

  const trackerUrl =
    process.env.NEXT_PUBLIC_TRACKER_URL ||
    (typeof window !== 'undefined' ? `${window.location.origin}/tracker.js` : '/tracker.js');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const snippet = `<script defer src="${trackerUrl}"
  data-site-id="${siteId}"
  data-api="${apiUrl}/api/events/collect"></script>`;

  async function save(e) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    try {
      const updated = await api.updateSite(siteId, form);
      setSite(updated);
      setStatus('Settings saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this site and all of its analytics data?')) return;
    try {
      await api.deleteSite(siteId);
      router.push('/sites');
    } catch (err) {
      setError(err.message);
    }
  }

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Layout title="Settings" siteId={siteId} siteName={site?.name} siteDomain={site?.domain}>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {error && <p className="form-error">{error}</p>}
      {status && <p className="form-success">{status}</p>}

      <section className="card">
        <h2>Tracking code</h2>
        <p className="muted">Paste this before the closing &lt;/body&gt; tag on your site.</p>
        <pre className="code-block">{snippet}</pre>
        <button className="btn btn-secondary" onClick={copy}>
          {copied ? 'Copied!' : 'Copy snippet'}
        </button>
      </section>

      <section className="card">
        <h2>Site details</h2>
        <form onSubmit={save} className="form">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Domain
            <input
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              required
            />
          </label>
          <label>
            Timezone
            <input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Save changes
          </button>
        </form>
      </section>

      <section className="card card--danger">
        <h2>Danger zone</h2>
        <p className="muted">Deleting a site permanently removes all of its events.</p>
        <button className="btn btn-danger" onClick={remove}>
          Delete site
        </button>
      </section>
    </Layout>
  );
}
