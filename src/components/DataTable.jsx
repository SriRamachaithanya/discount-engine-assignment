/**
 * DataTable.jsx
 *
 * Renders a simple table from an array of objects.
 * Columns are defined as [{ key, label, render? }].
 */

export default function DataTable({ columns, rows, emptyMessage = 'No data loaded.' }) {
  if (!rows || rows.length === 0) {
    return (
      <div
        style={{
          padding: '1.25rem',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: 13,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 8, background: 'rgba(0,0,0,0.1)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontWeight: 700,
                  fontSize: 10,
                  color: 'rgba(255, 255, 255, 0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'background 0.2s',
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: '8px 12px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    verticalAlign: 'top',
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
