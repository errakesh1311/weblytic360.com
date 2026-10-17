const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();
                                    
router.use(protect);

/** List notifications plus the unread count used by the bell badge. */
router.get('/', (req, res, next) => {
  try {
    res.json({
      notifications: Notification.findByUser(req.user.id),
      unread: Notification.countUnread(req.user.id),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/read-all', (req, res, next) => {
  try {
    Notification.markAllRead(req.user.id);
    res.json({ unread: 0 });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/read', (req, res, next) => {
  try {
    const existing = Notification.findById(req.params.id);
    if (!existing || existing.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    const notification = Notification.markRead(req.params.id, req.user.id);
    res.json({ notification, unread: Notification.countUnread(req.user.id) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    Notification.remove(req.params.id, req.user.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
