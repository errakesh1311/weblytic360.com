const express = require('express');
const {
  login,
  signup,
  me,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  updatePreferences,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

// Brute-force protection. Counted per IP over a rolling window.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again in a few minutes',
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many accounts created from this address, please try again later',
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests, please try again later',
});

router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', resetLimiter, forgotPassword);
router.post('/reset-password', resetLimiter, resetPassword);

router.get('/me', protect, me);
router.patch('/me', protect, updateMe);
router.patch('/preferences', protect, updatePreferences);
router.post('/change-password', protect, resetLimiter, changePassword);

module.exports = router;