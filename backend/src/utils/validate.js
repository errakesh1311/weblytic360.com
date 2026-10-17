/**
 * Small, dependency-free validators shared by the auth controller.
 */

// Deliberately pragmatic rather than RFC-5322 complete.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

/** A handful of passwords that pass the length/complexity rules but are still terrible. */
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'passw0rd', 'qwerty123', 'qwertyui',
  '12345678', '123456789', '1234567890', 'iloveyou', 'welcome1', 'admin123',
  'letmein1', 'football1', 'baseball1', 'sunshine1', 'princess1', 'abc12345',
]);

function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim());
}

/**
 * Returns an error message, or `null` when the password is acceptable.
 * Requires length plus at least one letter and one digit.
 */
function passwordError(value) {
  const password = String(value ?? '');

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'That password is too common, please choose another';
  }
  return null;
}

/** Trims and collapses whitespace, then caps the length. */
function cleanName(value, fallback = '') {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  return (name || fallback).slice(0, 80);
}

module.exports = { isEmail, passwordError, cleanName, MIN_PASSWORD_LENGTH };
