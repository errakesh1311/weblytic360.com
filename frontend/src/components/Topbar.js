import Link from 'next/link';
import { useEffect, useState } from 'react';
import DateRangePicker from './DateRangePicker';
import SiteSwitcher from './SiteSwitcher';
import ModeToggle from './ModeToggle';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import { getUser } from '../lib/api';

export default function Topbar({
  range,
  onRangeChange,
  liveCount,
  siteId,
  siteName,
  siteDomain,
}) {
  // The session lives in localStorage, which the server cannot see. Reading it
  // during render would make the server and client markup disagree, so it is
  // loaded after mount instead.
  const [user, setUser] = useState(null);
  useEffect(() => setUser(getUser()), []);

  return (
    <header className="topbar">
      <Link href="/sites" className="topbar-brand">
        <span className="topbar-logo">W</span>
        <span>Weblytic360</span>
      </Link>

      <div className="topbar-center">
        {siteId && <SiteSwitcher siteId={siteId} siteName={siteName} siteDomain={siteDomain} />}
        {user && <ModeToggle siteId={siteId} />}

        {typeof liveCount === 'number' && (
          <span className="live-badge">
            <span className="live-dot" />
            {liveCount} online
          </span>
        )}
      </div>

      <div className="topbar-actions">
        {onRangeChange && <DateRangePicker value={range} onChange={onRangeChange} />}

        <Link href="/pricing" className="topbar-link">
          Plans
        </Link>
        {user && <NotificationBell />}
        <UserMenu user={user} />
      </div>
    </header>
  );
}