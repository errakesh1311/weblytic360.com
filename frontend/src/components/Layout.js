import Head from 'next/head';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TrialBanner from './TrialBanner';
import { getUser } from '../lib/api';

export default function Layout({
  children,
  title,
  siteId,
  siteName,
  siteDomain,
  range,
  onRangeChange,
  liveCount,
}) {
  // Read after mount: localStorage is not available during server rendering.
  const [trial, setTrial] = useState(null);
  useEffect(() => setTrial(getUser()?.trial || null), []);

  return (
    <div className="layout">
      <Head>
        <title>{title ? `${title} · Weblytic360` : 'Weblytic360'}</title>
      </Head>

      <Topbar
        range={range}
        onRangeChange={onRangeChange}
        liveCount={liveCount}
        siteId={siteId}
        siteName={siteName}
        siteDomain={siteDomain}
      />

      <TrialBanner trial={trial} />

      <div className="layout-content">
        {siteId && <Sidebar siteId={siteId} siteName={siteName} siteDomain={siteDomain} />}
        <main className={`main-content ${siteId ? '' : 'main-content--full'}`}>{children}</main>
      </div>
    </div>
  );
}