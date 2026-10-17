const express = require('express');
const {
  createSite,
  getSites,
  getSiteById,
  updateSite,
  deleteSite,
} = require('../controllers/siteController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createSite);
router.get('/', getSites);
router.get('/:siteId', getSiteById);
router.put('/:siteId', updateSite);
router.delete('/:siteId', deleteSite);

module.exports = router;