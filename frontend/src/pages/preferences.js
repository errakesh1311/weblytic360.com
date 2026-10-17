import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api, { setSession, getToken } from '../lib/api';
import { useAuth } from '../lib/auth';
import { applyTheme } from './_app';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export default function PreferencesPage() {
  const { ready } = useAuth();
  const [prefs, setPrefs] = useState({ darkMode: false, timezone: 'UTC', weekStartsOn: 'monday' });
  const [state, setState] = useState({ error: null, ok: null, saving: false });

  useEffect(() => {
    if (!ready) return;
    api
      .me()
      .then(({ user }) => {
        if (user.preferences) setPrefs(user.preferences);
      })
      .catch((e) => setState((s) => ({ ...s, error: e.message })));
  }, [ready]);

  const update = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (patch.darkMode !== undefined) applyTheme(patch.darkMode);
  };

  const save = async (e) => {
    e.preventDefault();
    setState({ error: null, ok: null, saving: true });
    try {
      const { user } = await api.updatePreferences(prefs);
      setSession(getToken(), user);
      applyTheme(user.preferences.darkMode);
      setState({ error: null, ok: 'Preferences saved', saving: false });
    } catch (err) {
      setState({ error: err.message, ok: null, saving: false });
    }
  };

  if (!ready) return null;

  return (
    <Layout title="Preferences">
      <div className="page-header">
        <h1>Preferences</h1>
      </div>

      <form className="card" onSubmit={save}>
        <h2>Appearance</h2>
        <label className="toggle-row">
          <span>
            <strong>Dark mode</strong>
            <small>Use a dark colour scheme across the dashboard.</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.darkMode}
            className={`switch ${prefs.darkMode ? 'switch--on' : ''}`}
            onClick={() => update({ darkMode: !prefs.darkMode })}
          >
            <span className="switch-knob" />
          </button>
        </label>

        <h2>Localisation</h2>
        <label className="field">
          <span>Timezone</span>
          <select value={prefs.timezone} onChange={(e) => update({ timezone: e.target.value })}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Week starts on</span>
          <select
            value={prefs.weekStartsOn}
            onChange={(e) => update({ weekStartsOn: e.target.value })}
          >
            <option value="monday">Monday</option>
            <option value="sunday">Sunday</option>
          </select>
        </label>

        <div className="import-actions">
          <button type="submit" className="btn-primary" disabled={state.saving}>
            {state.saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>

        {state.ok && <p className="form-success">{state.ok}</p>}
        {state.error && <p className="form-error">{state.error}</p>}
      </form>
    </Layout>
  );
}
