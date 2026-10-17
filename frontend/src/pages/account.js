import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api, { setSession, getToken } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function AccountPage() {
  const { ready } = useAuth();

  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [profileState, setProfileState] = useState({ error: null, ok: null, saving: false });

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordState, setPasswordState] = useState({ error: null, ok: null, saving: false });

  useEffect(() => {
    if (!ready) return;
    api
      .me()
      .then(({ user: u }) => {
        setUser(u);
        setName(u.name || '');
      })
      .catch((e) => setProfileState((s) => ({ ...s, error: e.message })));
  }, [ready]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileState({ error: null, ok: null, saving: true });

    try {
      const { user: updated } = await api.updateMe({ name });
      setUser(updated);
      // Keep the cached copy used by the topbar in sync.
      setSession(getToken(), updated);
      setProfileState({ error: null, ok: 'Profile updated', saving: false });
    } catch (err) {
      setProfileState({ error: err.message, ok: null, saving: false });
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();

    if (passwords.next !== passwords.confirm) {
      setPasswordState({ error: 'The two passwords do not match', ok: null, saving: false });
      return;
    }

    setPasswordState({ error: null, ok: null, saving: true });

    try {
      const { token, user: updated } = await api.changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setSession(token, updated);
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordState({ error: null, ok: 'Password changed', saving: false });
    } catch (err) {
      setPasswordState({ error: err.message, ok: null, saving: false });
    }
  };

  if (!ready || !user) return null;

  return (
    <Layout title="Account">
      <div className="page-header">
        <h1>Account</h1>
        <span className="plan-pill">{user.plan} plan</span>
      </div>

      <div className="account-grid">
        <section className="card">
          <h2>Profile</h2>
          <p className="card-sub">This name appears across your dashboard.</p>

          <form className="inline-form inline-form--stacked" onSubmit={saveProfile}>
            <label htmlFor="name">Display name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />

            <label htmlFor="email">Email</label>
            <input id="email" value={user.email} disabled readOnly />
            <p className="field-hint">Your email address cannot be changed yet.</p>

            {profileState.error && <p className="form-error">{profileState.error}</p>}
            {profileState.ok && <p className="form-ok">{profileState.ok}</p>}

            <button type="submit" className="btn-primary" disabled={profileState.saving}>
              {profileState.saving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Password</h2>
          <p className="card-sub">
            At least 8 characters, including a letter and a number.
          </p>

          <form className="inline-form inline-form--stacked" onSubmit={savePassword}>
            <label htmlFor="current">Current password</label>
            <input
              id="current"
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              placeholder="••••••••"
              required
            />

            <label htmlFor="next">New password</label>
            <input
              id="next"
              type="password"
              value={passwords.next}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
              placeholder="••••••••"
              minLength={8}
              required
            />

            <label htmlFor="confirm">Confirm new password</label>
            <input
              id="confirm"
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder="••••••••"
              minLength={8}
              required
            />

            {passwordState.error && <p className="form-error">{passwordState.error}</p>}
            {passwordState.ok && <p className="form-ok">{passwordState.ok}</p>}

            <button type="submit" className="btn-primary" disabled={passwordState.saving}>
              {passwordState.saving ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
