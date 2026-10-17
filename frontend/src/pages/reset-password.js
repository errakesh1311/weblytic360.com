import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api, { setSession } from '../lib/api';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('The two passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // A successful reset also signs the user straight in.
      const { token: jwt, user } = await api.resetPassword({ token, password });
      setSession(jwt, user);
      router.push('/sites');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // router.query is empty on the very first render.
  if (!router.isReady) return null;

  return (
    <div className="auth-page">
      <Head>
        <title>Choose a new password · Weblytic360</title>
      </Head>

      <div className="auth-card">
        <div className="auth-logo">W</div>
        <h1>Choose a new password</h1>

        {token ? (
          <>
            <p className="auth-sub">
              At least 8 characters, including a letter and a number.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />

              <label htmlFor="confirm">Confirm new password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="auth-sub">
              This link is missing its reset token. Request a fresh one.
            </p>
            <p className="auth-alt">
              <Link href="/forgot-password">Send a new reset link</Link>
            </p>
          </>
        )}

        <p className="auth-alt">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
