import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const NAV_SECTIONS = [
  {
    items: [
      { label: 'Dashboard', icon: '📊', path: '' },
      {
        label: 'Real Time',
        icon: '⚡',
        path: '/realtime',
        children: [
          { label: 'Overview', view: 'overview' },
          { label: 'Content', view: 'content' },
          { label: 'Sources', view: 'sources' },
          { label: 'Country', view: 'country' },
          { label: 'Events', view: 'events' },
          { label: 'Trends', view: 'trends' },
        ],
      },
    ],
  },
  {
    items: [
      {
        label: 'Audience',
        icon: '👥',
        path: '/audience',
        children: [
          { label: 'Overview', view: 'overview' },
          { label: 'Device', view: 'device' },
          { label: 'Country', view: 'country' },
          { label: 'Operating System', view: 'os' },
          { label: 'Browser', view: 'browser' },
          { label: 'Hostname', view: 'hostname' },
        ],
      },
      { label: 'Content', icon: '📄', path: '/content' },
      { label: 'AI Traffic', icon: '🤖', path: '/ai-traffic' },
      {
        label: 'Acquisition',
        icon: '🔗',
        path: '/acquisition',
        children: [
          { label: 'Entry pages', view: 'entry' },
          { label: 'Exit pages', view: 'exit' },
          { label: 'UTM Source', view: 'utm_source' },
          { label: 'UTM Medium', view: 'utm_medium' },
          { label: 'UTM Campaign', view: 'utm_campaign' },
          { label: 'UTM Term', view: 'utm_term' },
          { label: 'UTM Content', view: 'utm_content' },
          { label: 'Referrer + Source', view: 'referrer' },
        ],
      },
    ],
  },
  {
    items: [
      {
        label: 'Events',
        icon: '🎯',
        path: '/events',
        children: [
          { label: 'Event Overview', view: 'overview' },
          { label: 'Page Overview', view: 'pages' },
          { label: 'Google Quality Raters', view: 'raters' },
        ],
      },
      { label: 'Reports', icon: '📈', path: '/reports' },
    ],
  },
  {
    items: [
      { label: 'Settings', icon: '⚙️', path: '/settings' },
      { label: 'Import Historical Data', icon: '📥', path: '/import' },
    ],
  },
  {
    items: [
      { label: 'Help', icon: '❓', path: '/help' },
    ],
  },
];

/** A nav item that can expand to show sub-views (e.g. Real Time). */
function ExpandableItem({ item, siteId, currentPath, activeView }) {
  const href = `/site/${siteId}${item.path}`;
  const onSection = currentPath.startsWith(href);
  const [open, setOpen] = useState(onSection);

  // Auto-open when navigating onto this section.
  useEffect(() => {
    if (onSection) setOpen(true);
  }, [onSection]);

  return (
    <div className="sidebar-group">
      <button
        type="button"
        className={`sidebar-link sidebar-link--parent ${onSection ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="sidebar-icon">{item.icon}</span>
        <span>{item.label}</span>
        <span className={`sidebar-caret ${open ? 'open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="sidebar-sublist">
          {item.children.map((child) => {
            const childHref = `${href}?view=${child.view}`;
            const isActive = onSection && activeView === child.view;
            return (
              <Link
                key={child.view}
                href={childHref}
                className={`sidebar-sublink ${isActive ? 'active' : ''}`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ siteId, siteName, siteDomain }) {
  const router = useRouter();
  const currentPath = (router.asPath || '').split('?')[0];
  const activeView = router.query.view || 'overview';

  return (
    <aside className="sidebar">
      <div className="sidebar-site">
        <div className="sidebar-site-name">{siteName || 'My Site'}</div>
        <div className="sidebar-site-domain">{siteDomain}</div>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className="sidebar-section">
            {section.items.map((item) => {
              if (item.children) {
                return (
                  <ExpandableItem
                    key={item.path}
                    item={item}
                    siteId={siteId}
                    currentPath={currentPath}
                    activeView={activeView}
                  />
                );
              }

              const href = `/site/${siteId}${item.path}`;
              const isActive = item.path === ''
                ? currentPath === `/site/${siteId}` || currentPath === `/site/${siteId}/`
                : currentPath.startsWith(href);
              return (
                <Link key={item.path} href={href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {si < NAV_SECTIONS.length - 1 && <div className="sidebar-divider" />}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-mode">
          <span className="sidebar-mode-label">Mode</span>
          <span className="sidebar-mode-value">Site</span>
        </div>
      </div>
    </aside>
  );
}