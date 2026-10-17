import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from './api';
import { rangeToParams } from '../components/DateRangePicker';

/**
 * Loads the site record plus a metric bundle for the selected range.
 * `load` receives (siteId, params) and returns the page's data.
 * `range` is either { days } or { start, end }.
 */
export function useSiteData(load, deps = []) {
  const router = useRouter();
  const { siteId } = router.query;

  const [site, setSite] = useState(null);
  const [data, setData] = useState(null);
  const [range, setRange] = useState({ days: 7 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) return;
    api.getSite(siteId).then(setSite).catch((e) => setError(e.message));
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    setError(null);

    Promise.resolve(load(siteId, rangeToParams(range)))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, range.days, range.start, range.end, ...deps]);

  return { siteId, site, data, range, setRange, error, loading };
}

export default useSiteData;
