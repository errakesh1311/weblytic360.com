const User = require('../models/User');
const Notification = require('../models/Notification');
const { signToken } = require('../middleware/auth');
const { isEmail, passwordError, cleanName } = require('../utils/validate');
const emailService = require('../services/email');
const config = require('../config');

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  plan: u.plan,
  trial: User.trialStatus(u),
  preferences: {
    darkMode: !!u.dark_mode,
    timezone: u.timezone || 'UTC',
    weekStartsOn: u.week_starts_on || 'monday',
  },
});

/** Same shape for every successful auth response. */
const sendAuth = (res, user, status = 200) =>
  res.status(status).json({ token: signToken(user), user: publicUser(user) });

exports.signup = async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  const pwError = passwordError(password);
  if (pwError) {
    return res.status(400).json({ message: pwError });
  }

  const normalisedEmail = String(email).trim().toLowerCase();

  try {
    if (User.findByEmail(normalisedEmail)) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const user = await User.create({
      name: cleanName(name, normalisedEmail.split('@')[0]),
      email: normalisedEmail,
      password,
    });

    Notification.create({
      userId: user.id,
      type: 'success',
      title: 'Welcome to Weblytic360',
      body: 'Add your first website to start collecting privacy-friendly analytics.',
      link: '/sites',
    });

    // Fire-and-forget so a slow mail provider never delays signup.
    emailService.sendWelcomeEmail(user).catch(() => {});

    sendAuth(res, user, 201);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = User.findByEmail(email);
    if (!user || !(await User.comparePassword(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    sendAuth(res, user);
  } catch (error) {
    next(error);
  }
};

exports.me = (req, res) => {
  res.json({ user: publicUser(req.user) });
};

/** PATCH /api/auth/me - update the display name. */
exports.updateMe = (req, res, next) => {
  const { name } = req.body;

  if (!name || !cleanName(name)) {
    return res.status(400).json({ message: 'Name cannot be empty' });
  }

  try {
    const user = User.updateName(req.user.id, cleanName(name));
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/auth/preferences - dark mode, timezone, week start. */
exports.updatePreferences = (req, res, next) => {
  const { darkMode, timezone, weekStartsOn } = req.body;

  if (timezone !== undefined && typeof timezone !== 'string') {
    return res.status(400).json({ message: 'Invalid timezone' });
  }
  if (weekStartsOn !== undefined && !['monday', 'sunday'].includes(weekStartsOn)) {
    return res.status(400).json({ message: 'Week must start on monday or sunday' });
  }

  try {
    const user = User.updatePreferences(req.user.id, { darkMode, timezone, weekStartsOn });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

/** POST /api/auth/change-password - requires the current password. */
exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: 'Current password and new password are required' });
  }

  const pwError = passwordError(newPassword);
  if (pwError) {
    return res.status(400).json({ message: pwError });
  }

  try {
    // `req.user` comes from findById, which omits the hash - reload the full row.
    const user = User.findByEmail(req.user.email);
    if (!(await User.comparePassword(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    if (await User.comparePassword(newPassword, user.password)) {
      return res
        .status(400)
        .json({ message: 'New password must be different from the current one' });
    }

    const updated = await User.updatePassword(user.id, newPassword);
    User.clearResetToken(user.id);

    sendAuth(res, updated);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 *
 * Always answers 200 so the endpoint cannot be used to discover which email
 * addresses have an account.
 */
exports.forgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email || !isEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  const genericResponse = {
    message: 'If an account exists for that email, a reset link has been sent',
  };

  try {
    const user = User.findByEmail(email);
    if (!user) return res.json(genericResponse);

    const token = User.createResetToken(user.id);

    // Send the reset email (fire-and-forget). When Resend is configured this
    // delivers a real message; otherwise the service logs it to the console.
    emailService.sendPasswordResetEmail(user, token).catch(() => {});

    // In development, also return the link/token so the flow is testable
    // end to end without an inbox.
    if (process.env.NODE_ENV !== 'production') {
      const frontend = config.FRONTEND_URL;
      console.log(
        `[auth] password reset for ${user.email}: ${frontend}/reset-password?token=${token}`
      );
      return res.json({ ...genericResponse, resetToken: token });
    }

    res.json(genericResponse);
  } catch (error) {
    next(error);
  }
};

/** POST /api/auth/reset-password - consumes a token from forgotPassword. */
exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  const pwError = passwordError(password);
  if (pwError) {
    return res.status(400).json({ message: pwError });
  }

  try {
    const user = User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'That reset link is invalid or has expired' });
    }

    const updated = await User.updatePassword(user.id, password);
    User.clearResetToken(user.id);

    sendAuth(res, updated);
  } catch (error) {
    next(error);
  }
};