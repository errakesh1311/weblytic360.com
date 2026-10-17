import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api, { setSession } from '../lib/api';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { token, user } = await api.signup(form);
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
        <title>Sign up · Weblytic360</title>
      </Head>

      <div className="auth-card">
        <div className="auth-logo">W</div>
        <h1>Start for free</h1>
        <p className="auth-sub">No credit card required · 10,000 events/month</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input id="name" value={form.name} onChange={update('name')} placeholder="Jane Doe" />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="you@company.com"
            required
          />
    
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={update('password')}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-alt">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
