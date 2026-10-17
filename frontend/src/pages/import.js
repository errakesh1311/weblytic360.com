import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

const SAMPLE_CSV = `url,type,referrer,browser,os,device,country,timestamp
/home,pageview,https://google.com,Chrome,macOS,desktop,US,2024-01-15T10:00:00Z
/pricing,pageview,,Safari,iOS,mobile,GB,2024-01-15T10:05:00Z`;

export default function ImportPage() {
  const { ready } = useAuth();
  const [sites, setSites] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [siteId, setSiteId] = useState('');
  const [filename, setFilename] = useState('');
  const [csv, setCsv] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [importing, setImporting] = useState(false);

  const loadJobs = () => api.imports().then((d) => setJobs(d.jobs)).catch(() => {});

  useEffect(() => {
    if (!ready) return;
    api
      .listSites()
      .then((list) => {
        setSites(list);
        if (list[0]) setSiteId(list[0].id);
      })
      .catch((e) => setError(e.message));
    loadJobs();
  }, [ready]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result));
    reader.readAsText(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setImporting(true);
    try {
      const { job } = await api.createImport({
        siteId,
        filename: filename || 'upload.csv',
        csv,
      });
      setJobs((list) => [job, ...list]);
      setStatus(`Imported ${job.importedRows.toLocaleString()} events successfully.`);
      setCsv('');
      setFilename('');
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteImport(id);
      setJobs((list) => list.filter((j) => j.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout title="Import data">
      <div className="page-header">
        <h1>Import historical data</h1>
      </div>

      <section className="card">
        <h2>Upload a CSV</h2>
        <p className="card-sub">
          Bring pageviews and events from another analytics tool. Required column:
          <code className="api-prefix"> url</code>. Optional: type, referrer, browser, os,
          device, country, utm_source, utm_medium, utm_campaign, visitor_id, timestamp.
        </p>

        <form className="import-form" onSubmit={submit}>
          <label className="field">
            <span>Destination site</span>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} required>
              {sites.length === 0 && <option value="">No sites yet</option>}
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.domain})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={onFile} />
          </label>

          <label className="field">
            <span>Or paste CSV</span>
            <textarea
              rows={6}
              placeholder={SAMPLE_CSV}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
          </label>

          <div className="import-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setCsv(SAMPLE_CSV);
                setFilename('sample.csv');
              }}
            >
              Use sample data
            </button>
            <button type="submit" className="btn-primary" disabled={importing || !siteId || !csv}>
              {importing ? 'Importing…' : 'Start import'}
            </button>
          </div>
        </form>

        {status && <p className="form-success">{status}</p>}
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="card">
        <h2>Import history</h2>
        {jobs.length === 0 ? (
          <p className="muted">No imports yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Status</th>
                <th className="num">Rows</th>
                <th>When</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <strong>{j.filename || 'upload.csv'}</strong>
                  </td>
                  <td>
                    <span className={`status-pill status-pill--${j.status}`}>{j.status}</span>
                  </td>
                  <td className="num">
                    {j.importedRows.toLocaleString()} / {j.totalRows.toLocaleString()}
                  </td>
                  <td>{new Date(j.createdAt).toLocaleString()}</td>
                  <td className="num">
                    <button type="button" className="btn-ghost" onClick={() => remove(j.id)}>
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
