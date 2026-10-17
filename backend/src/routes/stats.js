const express = require('express');
const stats = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Must precede the /:siteId routes so "network" is not treated as a site id.
router.get('/network', stats.getNetwork);

router.get('/:siteId', stats.getSiteStats);
router.get('/:siteId/overview', stats.getOverview);
router.get('/:siteId/timeseries', stats.getTimeseries);
router.get('/:siteId/metrics', stats.getMetrics);
router.get('/:siteId/pages/:which', stats.getEntryExitPages);
router.get('/:siteId/active', stats.getActive);
router.get('/:siteId/ai', stats.getAiTraffic);

module.exports = router;