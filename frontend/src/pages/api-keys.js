import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

export default function ApiKeysPage() {
  const { ready } = useAuth();
  const [keys, setKeys] = useState([]);
  const [scopes, setScopes] = useState(['read', 'write']);
  const [form, setForm] = useState({ name: '', scope: 'read' });
  const [secret, setSecret] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () =>
    api
      .apiKeys()
      .then((d) => {
        setKeys(d.keys);
        setScopes(d.scopes);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  const create = async (e) => {
    e.preventDefault();
    setError(null);
    setSecret(null);
    setCreating(true);
    try {
      const { key, secret: raw } = await api.createApiKey(form);
      setKeys((list) => [key, ...list]);
      setSecret(raw);
      setForm({ name: '', scope: 'read' });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id) => {
    try {
      const { key } = await api.revokeApiKey(id);
      setKeys((list) => list.map((k) => (k.id === id ? key : k)));
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteApiKey(id);
      setKeys((list) => list.filter((k) => k.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout title="API keys">
      <div className="page-header">
        <h1>API keys</h1>
        <span className="plan-pill">
          {keys.length} key{keys.length === 1 ? '' : 's'}
        </span>
      </div>

      <section className="card">
        <h2>Create a key</h2>
        <p className="card-sub">
          Use keys to send events or read stats from the Weblytic360 API.
        </p>
        <form className="team-invite" onSubmit={create}>
          <input
            type="text"
            placeholder="e.g. Production server"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
            {scopes.map((s) => (
              <option key={s} value={s}>
                {s === 'write' ? 'Read & write' : 'Read only'}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create key'}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}

        {secret && (
          <div className="api-secret">
            <p className="field-hint">
              Copy this key now — you won&apos;t be able to see it again.
            </p>
            <div className="api-secret-row">
              <code>{secret}</code>
              <button type="button" className="btn-ghost" onClick={copy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Your keys</h2>
        {keys.length === 0 ? (
          <p className="muted">No API keys yet. Create one above.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Scope</th>
                <th>Last used</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>
                    <strong>{k.name}</strong>
                  </td>
                  <td>
                    <code className="api-prefix">{k.prefix}…</code>
                  </td>
                  <td>
                    <span className="status-pill status-pill--active">{k.scope}</span>
                  </td>
                  <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                  <td className="num">
                    {k.revokedAt ? (
                      <span className="status-pill status-pill--revoked">Revoked</span>
                    ) : (
                      <button type="button" className="btn-ghost" onClick={() => revoke(k.id)}>
                        Revoke
                      </button>
                    )}
                    <button type="button" className="btn-ghost" onClick={() => remove(k.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
}
