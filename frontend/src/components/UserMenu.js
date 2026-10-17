import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { logout } from '../lib/auth';

/** "KS" from "Kavita Sharma", "K" from "kavita@example.com". */
function initials(user) {
  const source = (user?.name || user?.email || '?').trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function UserMenu({ user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on an outside click or on Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Any navigation should dismiss the menu.
  useEffect(() => {
    const close = () => setOpen(false);
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events]);

  if (!user) return null;

  const go = (href) => () => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="user-menu-meta">
          <span className="user-menu-name">{user.name || 'Account'}</span>
          <span className="user-menu-email">{user.email}</span>
        </span>
        <span className="user-menu-avatar">{initials(user)}</span>
      </button>

      {open && (
        <div className="user-menu-panel" role="menu">          <div className="user-menu-head">
            <span className="user-menu-head-label">Signed in as</span>
            <strong>{user.email}</strong>
            <span className="user-menu-plan">
              {user.plan} plan
              {user.trial?.onTrial ? ` · ${user.trial.daysLeft}d trial left` : ''}
            </span>
          </div>          <div className="user-menu-group">
            <button type="button" role="menuitem" onClick={go('/account')}>
              Profile settings
            </button>
            <button type="button" role="menuitem" onClick={go('/sites')}>
              Manage websites
            </button>            <button type="button" role="menuitem" onClick={go('/team')}>
              Manage team
            </button>
          </div>

          <div className="user-menu-group">
            <span className="user-menu-label">Developer</span>
            <button type="button" role="menuitem" onClick={go('/api-keys')}>
              API keys
            </button>
            <button type="button" role="menuitem" onClick={go('/import')}>
              Import data
            </button>
            <button type="button" role="menuitem" onClick={go('/preferences')}>
              Preferences
            </button>
          </div>

          <div className="user-menu-group">
            <span className="user-menu-label">Billing</span>
            <button type="button" role="menuitem" onClick={go('/pricing')}>
              Plans &amp; pricing
            </button>
          </div>

          <div className="user-menu-group">
            <button
              type="button"
              role="menuitem"
              className="user-menu-danger"
              onClick={() => logout(router)}
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
