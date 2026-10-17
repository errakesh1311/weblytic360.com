import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api, { setSession } from '../lib/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { token, user } = await api.login({ email, password });
      setSession(token, user);
      router.push('/sites');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Head>
        <title>Sign in · Weblytic360</title>
      </Head>

      <div className="auth-card">
        <div className="auth-logo">W</div>
        <h1>Welcome back</h1>
        <p className="auth-sub">Sign in to your Weblytic360 account</p>

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

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-alt">
          Don&apos;t have an account? <Link href="/signup">Sign up free</Link>
        </p>
        <p className="auth-alt">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="auth-demo">
          Demo: <code>demo@weblytic360.com</code> / <code>demo1234</code>
        </p>
      </div>
    </div>
  );
}