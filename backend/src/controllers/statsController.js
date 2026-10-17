const Site = require('../models/Site');
const agg = require('../services/aggregation');

/** Loads the site and 404s if the caller does not own it. */
function requireSite(req, res) {
  const site = Site.ownedBy(req.params.siteId, req.user.id);
  if (!site) {
    res.status(404).json({ message: 'Site not found' });
    return null;
  }
  return site;
}

exports.getOverview = (req, res, next) => {
  try {
    const site = requireSite(req, res);
    if (!site) return;
    res.json(agg.getOverview(site.id, req.query));
  } catch (error) {
    next(error);
  }
};

exports.getTimeseries = (req, res, next) => {
  try {
    const site = requireSite(req, res);
    if (!site) return;
    res.json(agg.getTimeseries(site.id, req.query));
  } catch (error) {
    next(error);
  }
};

exports.getMetrics = (req, res, next) => {
  try {
    const site = requireSite(req, res);
    if (!site) return;

    const type = req.query.type || 'url';
    if (!agg.METRIC_COLUMNS[type]) {
      return res.status(400).json({
        message: `Unsupported metric type '${type}'`,
        supported: Object.keys(agg.METRIC_COLUMNS),
      });
    }
    res.json(agg.getMetrics(site.id, type, req.query));
  } catch (error) {
    next(error);
  }
};

exports.getActive = (req, res, next) => {
  try {
    const site = requireSite(req, res);
    if (!site) return;
    res.json(agg.getActive(site.id, { minutes: req.query.minutes }));
  } catch (error) {
    next(error);
  }
};

exports.getEntryExitPages = (req, res, next) => {
  try {
    const site = requireSite(req, res);
    if (!site) return;
    const which = req.params.which === 'exit' ? 'exit' : 'entry';
    res.json(agg.getEntryExitPages(site.id, which, req.query));
  } catch (error) {
    next(error);
  }
};

exports.getAiTraffic = (req, res, next) => {
  try {
    const site = requireSite(req, res);
    if (!site) return;
    res.json(agg.getAiTraffic(site.id, req.query));
  } catch (error) {
    next(error);
  }
};

/** Combined view across every site the user owns. */
exports.getNetwork = (req, res, next) => {
  try {
    const sites = Site.findByUser(req.user.id);
    res.json(agg.getNetwork(sites, req.query));
  } catch (error) {
    next(error);
  }
};

/** Everything the dashboard needs in one round trip. */
exports.getSiteStats = (req, res, next) => {
  try {
    const site = requireSite(req, res);
    if (!site) return;

    res.json({
      site: { id: site.id, name: site.name, domain: site.domain },
      overview: agg.getOverview(site.id, req.query),
      timeseries: agg.getTimeseries(site.id, req.query),
      pages: agg.getMetrics(site.id, 'url', req.query),
      referrers: agg.getMetrics(site.id, 'referrer', req.query),
      browsers: agg.getMetrics(site.id, 'browser', req.query),
      devices: agg.getMetrics(site.id, 'device', req.query),
      countries: agg.getMetrics(site.id, 'country', req.query),
      events: agg.getMetrics(site.id, 'event', req.query),
      active: agg.getActive(site.id),
    });
  } catch (error) {
    next(error);
  }
};