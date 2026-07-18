/**
 * ErrorBanner.jsx
 * Displays a list of parse or validation errors.
 */

export default function ErrorBanner({ errors }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div
      style={{
        background: 'rgba(239, 83, 80, 0.08)',
        border: '1px solid rgba(239, 83, 80, 0.2)',
        borderLeft: '3px solid #ef5350',
        borderRadius: 12,
        padding: '0.65rem 0.9rem',
        marginTop: '0.75rem',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 12, color: '#ef5350', marginBottom: 4 }}>
        {errors.length} issue{errors.length > 1 ? 's' : ''} found
      </div>
      {errors.map((e, i) => (
        <div key={i} style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.75)', marginTop: 2, lineHeight: 1.4 }}>
          • {e}
        </div>
      ))}
    </div>
  );
}
