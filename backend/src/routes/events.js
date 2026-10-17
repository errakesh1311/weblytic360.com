const express = require('express');
const { collect, getEvents, deleteEvent } = require('../controllers/eventController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public ingest endpoint used by the tracking script (no auth).
router.post('/collect', collect);

// Dashboard endpoints.
router.get('/:siteId', protect, getEvents);
router.delete('/:siteId/:eventId', protect, deleteEvent);

module.exports = router;