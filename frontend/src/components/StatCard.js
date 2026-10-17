export default function StatCard({ label, value, change, suffix = '' }) {
  const positive = change > 0;
  const neutral = change === 0 || change === undefined || change === null;

  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix}
      </div>
      {!neutral && (
        <div className={`stat-change ${positive ? 'up' : 'down'}`}>
          {positive ? '▲' : '▼'} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}
