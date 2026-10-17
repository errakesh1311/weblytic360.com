import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import api from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setSent(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Head>
        <title>Reset your password · Weblytic360</title>
      </Head>

      <div className="auth-card">
        <div className="auth-logo">W</div>

        {sent ? (
          <>
            <h1>Check your inbox</h1>
            <p className="auth-sub">{sent.message}</p>

            {/*
              The API only returns a token outside production, where no email
              provider is configured yet. It lets you walk the flow locally.
            */}
            {sent.resetToken && (
              <p className="auth-demo">
                Dev shortcut:{' '}
                <Link href={`/reset-password?token=${sent.resetToken}`}>
                  open the reset link
                </Link>
              </p>
            )}

            <p className="auth-alt">
              <Link href="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            <h1>Forgot your password?</h1>
            <p className="auth-sub">
              Enter your email and we&apos;ll send you a link to choose a new one.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="auth-alt">
              Remembered it? <Link href="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
