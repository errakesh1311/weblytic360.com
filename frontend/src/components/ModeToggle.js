import { useRouter } from 'next/router';

/**
 * Switches between a single-site view and the combined Network view, matching
 * the Site / Network toggle in the reference design.
 */
export default function ModeToggle({ siteId }) {
  const router = useRouter();
  const isNetwork = router.pathname === '/network';

  const goSite = () => {
    if (isNetwork) router.push(siteId ? `/site/${siteId}` : '/sites');
  };
  const goNetwork = () => {
    if (!isNetwork) router.push('/network');
  };

  return (
    <div className="mode-toggle" role="tablist" aria-label="View mode">
      <button
        type="button"
        role="tab"
        aria-selected={!isNetwork}
        className={!isNetwork ? 'is-active' : ''}
        onClick={goSite}
      >
        <span aria-hidden="true">◱</span> Site
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isNetwork}
        className={isNetwork ? 'is-active' : ''}
        onClick={goNetwork}
      >
        <span aria-hidden="true">▦</span> Network
      </button>
    </div>
  );
}
