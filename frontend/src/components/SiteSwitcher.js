import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';

/** Header dropdown for switching between the user's sites. */
export default function SiteSwitcher({ siteId, siteName, siteDomain }) {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open || sites.length) return;
    api.listSites().then(setSites).catch(() => {});
  }, [open, sites.length]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const go = (id) => {
    setOpen(false);
    // Keep the current sub-page when switching sites.
    const sub = router.pathname.split('/site/[siteId]')[1] || '';
    router.push(`/site/${id}${sub}`);
  };

  return (
    <div className="siteswitcher" ref={ref}>
      <button
        type="button"
        className="siteswitcher-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="siteswitcher-globe" aria-hidden="true">🌐</span>
        <span className="siteswitcher-text">
          <small>Current site</small>
          <strong>{siteDomain || siteName || 'Select a site'}</strong>
        </span>
        <span className="siteswitcher-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <ul className="siteswitcher-menu" role="listbox">
          {sites.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={s.id === siteId}
                className={s.id === siteId ? 'is-active' : ''}
                onClick={() => go(s.id)}
              >
                <strong>{s.name}</strong>
                <small>{s.domain}</small>
              </button>
            </li>
          ))}
          {!sites.length && <li className="siteswitcher-empty">Loading…</li>}
          <li className="siteswitcher-foot">
            <button type="button" onClick={() => router.push('/sites')}>
              + Manage sites
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
