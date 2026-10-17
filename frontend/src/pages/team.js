import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

const ROLE_HINTS = {
  admin: 'Full access, including team and billing.',
  editor: 'Can view analytics and manage sites.',
  viewer: 'Read-only access to analytics.',
};

export default function TeamPage() {
  const { ready } = useAuth();
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState(['admin', 'editor', 'viewer']);
  const [form, setForm] = useState({ email: '', name: '', role: 'viewer' });
  const [error, setError] = useState(null);
  const [inviting, setInviting] = useState(false);

  const load = () =>
    api.team().then((d) => { setMembers(d.members); setRoles(d.roles); }).catch((e) => setError(e.message));

  useEffect(() => { if (ready) load(); }, [ready]);

  const invite = async (e) => {
    e.preventDefault();
    setError(null);
    setInviting(true);
    try {
      const { member } = await api.inviteMember(form);
      setMembers((list) => [...list, member]);
      setForm({ email: '', name: '', role: 'viewer' });
    } catch (err) { setError(err.message); } finally { setInviting(false); }
  };

  const changeRole = async (id, role) => {
    try {
      const { member } = await api.updateMemberRole(id, role);
      setMembers((list) => list.map((m) => (m.id === id ? member : m)));
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    try {
      await api.removeMember(id);
      setMembers((list) => list.filter((m) => m.id !== id));
    } catch (err) { setError(err.message); }
  };

  return (
    <Layout title="Team">
      <div className="page-header">
        <h1>Manage team</h1>
        <span className="plan-pill">{members.length} member{members.length === 1 ? '' : 's'}</span>
      </div>

      <section className="card">
        <h2>Invite a teammate</h2>
        <p className="card-sub">They&apos;ll get access to your workspace analytics.</p>
        <form className="team-invite" onSubmit={invite}>
          <input type="email" placeholder="teammate@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="text" placeholder="Name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roles.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
          </select>
          <button type="submit" className="btn-primary" disabled={inviting}>{inviting ? 'Inviting…' : 'Send invite'}</button>
        </form>
        <p className="field-hint">{ROLE_HINTS[form.role]}</p>
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="card">
        <h2>Members</h2>
        {members.length === 0 ? (
          <p className="muted">No teammates yet. Invite someone above.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Member</th><th>Status</th><th>Role</th><th className="num">Actions</th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td><div className="table-link"><strong>{m.name || m.email}</strong>{m.name && <small>{m.email}</small>}</div></td>
                  <td><span className={`status-pill status-pill--${m.status}`}>{m.status}</span></td>
                  <td>
                    <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)}>
                      {roles.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className="num"><button type="button" className="btn-ghost" onClick={() => remove(m.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
}