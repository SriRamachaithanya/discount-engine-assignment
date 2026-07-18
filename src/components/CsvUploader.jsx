/**
 * CsvUploader.jsx
 *
 * Renders a file upload area for a single CSV file.
 * Calls onLoad(rawText) when a file is selected.
 */

import { useRef } from 'react';

export default function CsvUploader({ label, description, onLoad, hasData, fileName }) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => onLoad(evt.target.result, file.name);
    reader.readAsText(file);
    // Reset input so the same file can be re-uploaded
    e.target.value = '';
  }

  return (
    <div
      style={{
        border: `2px dashed ${hasData ? 'rgba(0, 230, 118, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
        borderRadius: '8px',
        padding: '1.1rem 1.3rem',
        background: hasData ? 'rgba(0, 230, 118, 0.05)' : 'rgba(0, 0, 0, 0.15)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: 20 }}>{hasData ? '🟢' : '📄'}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
            {hasData ? fileName : description}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: hasData ? '#00e676' : '#ff5500',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {hasData ? 'Change' : 'Upload'}
          </span>
        </div>
      </div>
    </div>
  );
}
