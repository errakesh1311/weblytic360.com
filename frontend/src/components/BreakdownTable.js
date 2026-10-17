/**
 * Breakdown table with an inline percentage bar behind each row,
 * e.g. Top Pages / Referrers / Countries.
 */
export default function BreakdownTable({
  rows = [],
  labelHeader = 'Name',
  valueHeader = 'Pageviews',
  emptyText = 'No data for this period',
  limit,
}) {
  const visible = limit ? rows.slice(0, limit) : rows;
  if (!visible.length) {
    return (
      <div className="breakdown-empty-state">
        <span className="breakdown-empty-icon" aria-hidden="true">📡</span>
        <p>{emptyText}</p>
      </div>
    );
  }

  const max = Math.max(...visible.map((r) => r.y), 1);

  return (
    <table className="breakdown">
      <thead>
        <tr>
          <th>{labelHeader}</th>
          <th className="num">{valueHeader}</th>
        </tr>
      </thead>
      <tbody>
        {visible.map((r) => (
          <tr key={r.x}>
            <td>
              <span className="breakdown-bar" style={{ width: `${(r.y / max) * 100}%` }} />
              <span className="breakdown-name" title={r.x}>
                {r.x}
              </span>
            </td>
            <td className="num">
              <strong>{r.y.toLocaleString()}</strong>
              {typeof r.percent === 'number' && (
                <span className="breakdown-pct"> ({r.percent}%)</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
