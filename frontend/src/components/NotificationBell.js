import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';

/** "3h ago", "2d ago" - SQLite stores UTC without a timezone suffix. */
function timeAgo(value) {
  if (!value) return '';
  const then = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  const seconds = Math.round((Date.now() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.notifications();
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      // A failed poll should never break the dashboard chrome.
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => e.key === 'Escape' && setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  };

  const openItem = async (item) => {
    setOpen(false);
    if (!item.read_at) {
      setItems((list) =>
        list.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnread((n) => Math.max(0, n - 1));
      api.markNotificationRead(item.id).catch(() => {});
    }
    if (item.link) router.push(item.link);
  };

  const readAll = async () => {
    setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnread(0);
    api.markAllNotificationsRead().catch(() => {});
  };

  return (
    <div className="notif" ref={ref}>
      <button
        type="button"
        className="notif-trigger"
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="notif-readall" onClick={readAll}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading && <p className="notif-empty">Loading…</p>}

            {!loading && items.length === 0 && (
              <p className="notif-empty">You&apos;re all caught up.</p>
            )}

            {!loading &&
              items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`notif-item ${item.read_at ? '' : 'notif-item--unread'}`}
                  onClick={() => openItem(item)}
                >
                  <span className={`notif-dot notif-dot--${item.type}`} aria-hidden="true" />
                  <span className="notif-body">
                    <strong>{item.title}</strong>
                    {item.body && <span>{item.body}</span>}
                    <time>{timeAgo(item.created_at)}</time>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
