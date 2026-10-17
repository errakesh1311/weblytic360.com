import Link from 'next/link';

/**
 * Shown while a free account is still inside its trial window, and again once
 * the trial has lapsed. Paid plans pass `trial.onTrial === false`.
 */
export default function TrialBanner({ trial }) {
  if (!trial || (!trial.onTrial && !trial.expired)) return null;

  const endsAt = trial.endsAt ? new Date(trial.endsAt) : null;
  const formatted = endsAt
    ? endsAt.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  if (trial.expired) {
    return (
      <div className="trial-banner trial-banner--expired">
        <span className="trial-banner-icon" aria-hidden="true">
          !
        </span>
        <div>
          <strong>Your trial has ended</strong>
          <p>
            Upgrade to keep collecting analytics without limits.{' '}
            <Link href="/pricing">See plans</Link>
          </p>
        </div>
      </div>
    );
  }

  const urgent = trial.daysLeft <= 3;

  return (
    <div className={`trial-banner ${urgent ? 'trial-banner--urgent' : ''}`}>
      <span className="trial-banner-icon" aria-hidden="true">
        i
      </span>
      <div>
        <strong>
          Trial period &middot; {trial.daysLeft} day{trial.daysLeft === 1 ? '' : 's'} left
        </strong>
        <p>
          Your trial ends on {formatted}.{' '}
          <Link href="/pricing">Choose a plan</Link> to keep your data flowing.
        </p>
      </div>
    </div>
  );
}
