/**
 * Manual Resend smoke test.
 *
 *   node scripts/test-email.js you@example.com
 *
 * Sends all three transactional templates to the given address so you can
 * eyeball them in a real inbox. Reads RESEND_API_KEY / EMAIL_FROM from .env.
 *
 * NOTE: with the sandbox sender (onboarding@resend.dev) Resend only delivers
 * to the email you signed up with — use that address as the argument.
 */
require('dotenv').config();
const email = require('../src/services/email');

const to = process.argv[2];

if (!to) {
  console.error('Usage: node scripts/test-email.js <recipient@example.com>');
  process.exit(1);
}

if (!email.isConfigured()) {
  console.error(
    '\n  RESEND_API_KEY is not set in backend/.env — emails will only be logged, not sent.\n' +
      '  Add your key from https://resend.com and run again.\n'
  );
  process.exit(1);
}

const fakeUser = { name: 'Test User', email: to };

(async () => {
  console.log(`Sending test emails to ${to} ...\n`);

  const welcome = await email.sendWelcomeEmail(fakeUser);
  console.log('  welcome        ->', welcome);

  const reset = await email.sendPasswordResetEmail(fakeUser, 'test-token-123');
  console.log('  password reset ->', reset);

  const trial = await email.sendTrialEndingEmail(fakeUser, 3);
  console.log('  trial ending   ->', trial);

  const anyError = [welcome, reset, trial].some((r) => r && r.error);
  console.log(
    anyError
      ? '\n  One or more emails failed — check the errors above.\n'
      : '\n  All emails accepted by Resend. Check your inbox (and spam).\n'
  );
  process.exit(anyError ? 1 : 0);
})();
