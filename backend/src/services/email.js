const config = require('../config');

const resend = config.RESEND_API_KEY
  ? new (require('resend').Resend)(config.RESEND_API_KEY)
  : null;

const FRONTEND_URL = config.FRONTEND_URL;
const BRAND = '#1e2a52'; // navy, matches dashboard header cards

/** True when a real email provider is wired up. */
const isConfigured = () => !!resend;

/**
 * Low-level send. When Resend is not configured (local dev / tests) the email
 * is logged to the console instead of being sent, so flows stay testable.
 */
const send = async ({ to, subject, html, text }) => {
  if (!resend) {
    console.log(`[email] (not sent - RESEND_API_KEY missing) to=${to} subject="${subject}"`);
    return { id: null, skipped: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: config.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    if (error) throw error;
    return { id: data?.id || null, skipped: false };
  } catch (error) {
    // Never let a failed email break the request that triggered it.
    console.error(`[email] failed to send "${subject}" to ${to}:`, error.message || error);
    return { id: null, error: error.message || String(error) };
  }
};

/** Shared responsive HTML shell around the body content. */
const layout = (heading, bodyHtml) => `
  <div style="margin:0;padding:24px;background:#f4f6fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,.08);">
      <div style="background:${BRAND};padding:24px 32px;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-.2px;">Weblytic360</span>
      </div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:20px;color:#101828;">${heading}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:20px 32px;border-top:1px solid #eef0f4;">
        <p style="margin:0;font-size:12px;color:#98a2b3;">Privacy-friendly web analytics · weblytic360.com</p>
      </div>
    </div>
  </div>`;

const button = (href, label) => `
  <a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">${label}</a>`;

/** Sent after signup. */
const sendWelcomeEmail = (user) => {
  const html = layout(
    `Welcome aboard, ${user.name || 'there'} 👋`,
    `<p style="margin:0 0 20px;font-size:14px;color:#475467;line-height:1.6;">
       Thanks for joining Weblytic360. Add your first website and drop in our
       lightweight tracking snippet to start collecting privacy-friendly analytics —
       no cookies, no personal data.
     </p>
     <p style="margin:0 0 24px;">${button(`${FRONTEND_URL}/sites`, 'Add your first site')}</p>
     <p style="margin:0;font-size:13px;color:#98a2b3;">You're on a ${config.TRIAL_DAYS}-day free trial. No credit card required.</p>`
  );
  return send({
    to: user.email,
    subject: 'Welcome to Weblytic360',
    html,
    text: `Welcome to Weblytic360, ${user.name || 'there'}! Add your first site: ${FRONTEND_URL}/sites`,
  });
};

/** Sent from forgotPassword with a short-lived reset token. */
const sendPasswordResetEmail = (user, token) => {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  const html = layout(
    'Reset your password',
    `<p style="margin:0 0 20px;font-size:14px;color:#475467;line-height:1.6;">
       We received a request to reset the password for your Weblytic360 account.
       Click the button below to choose a new one. This link expires in 1 hour.
     </p>
     <p style="margin:0 0 24px;">${button(link, 'Reset password')}</p>
     <p style="margin:0;font-size:13px;color:#98a2b3;">
       If you didn't request this, you can safely ignore this email — your password won't change.
     </p>`
  );
  return send({
    to: user.email,
    subject: 'Reset your Weblytic360 password',
    html,
    text: `Reset your Weblytic360 password: ${link} (expires in 1 hour). If you didn't request this, ignore this email.`,
  });
};

/** Sent a few days before a trial ends. */
const sendTrialEndingEmail = (user, daysLeft) => {
  const html = layout(
    `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    `<p style="margin:0 0 20px;font-size:14px;color:#475467;line-height:1.6;">
       Your Weblytic360 free trial is wrapping up soon. Upgrade now to keep your
       dashboards, data, and tracking running without interruption.
     </p>
     <p style="margin:0 0 24px;">${button(`${FRONTEND_URL}/pricing`, 'Choose a plan')}</p>
     <p style="margin:0;font-size:13px;color:#98a2b3;">Questions? Just reply to this email.</p>`
  );
  return send({
    to: user.email,
    subject: `Your Weblytic360 trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html,
    text: `Your Weblytic360 trial ends in ${daysLeft} day(s). Upgrade: ${FRONTEND_URL}/pricing`,
  });
};

module.exports = {
  isConfigured,
  send,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTrialEndingEmail,
};
