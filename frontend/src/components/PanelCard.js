import Link from 'next/link';

/**
 * Publytics-style panel: dark navy header with a title (and optional right-side
 * label), a body, and an optional "View all →" footer link.
 */
export default function PanelCard({
  icon,
  title,
  rightLabel,
  viewAllHref,
  viewAllText,
  children,
  className = '',
}) {
  return (
    <section className={`panel-card ${className}`}>
      <header className="panel-card__head">
        <span className="panel-card__title">
          {icon && <span className="panel-card__icon">{icon}</span>}
          {title}
        </span>
        {rightLabel && <span className="panel-card__right">{rightLabel}</span>}
      </header>

      <div className="panel-card__body">{children}</div>

      {viewAllHref && (
        <Link href={viewAllHref} className="panel-card__viewall">
          {viewAllText || 'View all'} <span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  );
}
