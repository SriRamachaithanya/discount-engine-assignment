/**
 * App.jsx
 *
 * Top-level component. Manages state for rules, cart items, and results.
 * Wires together CSV upload / Natural Language rule creation → parse → engine → display.
 */

import { useState } from 'react';
import CsvUploader from './components/CsvUploader.jsx';
import DataTable from './components/DataTable.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';
import NlRuleInput from './components/NlRuleInput.jsx';
import { parseRulesCSV, parseCartCSV } from './engine/csvParser.js';
import { processCart } from './engine/discountEngine.js';
import { parseCartPdf } from './engine/pdfParser.js';

// ── Column definitions ───────────────────────────────────────────

const RULES_COLUMNS = [
  { key: 'ruleId', label: 'Rule ID' },
  { key: 'scope', label: 'Scope', render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'appliesTo', label: 'Applies To', render: (v, row) => row.scope === 'cart' ? '—' : v },
  { key: 'type', label: 'Type', render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  {
    key: 'value',
    label: 'Value',
    render: (v, row) => row.type === 'percentage' ? `${v}% off` : `Rs.${v.toLocaleString('en-IN')} off`,
  },
  { key: 'stackable', label: 'Stackable', render: (v) => (v ? 'Yes' : 'No') },
  {
    key: 'minCartValue',
    label: 'Min Cart Value',
    render: (v, row) => row.scope === 'cart' ? `Rs.${v.toLocaleString('en-IN')}` : '—'
  }
];

const CART_COLUMNS = [
  { key: 'itemId', label: 'Item' },
  { key: 'product', label: 'Product' },
  { key: 'brand', label: 'Brand' },
  { key: 'platform', label: 'Platform' },
  { key: 'basePrice', label: 'Base Price', render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
];

const RESULTS_COLUMNS = [
  { key: 'itemId', label: 'Item' },
  { key: 'product', label: 'Product' },
  { key: 'basePrice', label: 'Base Price', render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
  {
    key: 'reasoning', label: 'Rule(s) Applied',
    render: (v) => (
      <span style={{ color: v === 'No rules match' ? '#8e95a5' : '#fff', fontStyle: v === 'No rules match' ? 'italic' : 'normal', fontSize: 11.5 }}>
        {v}
      </span>
    ),
  },
  {
    key: 'finalPrice', label: 'Final Price',
    render: (v, row) => (
      <span style={{ fontWeight: 700, color: row.totalDiscount > 0 ? '#00e676' : '#fff' }}>
        Rs.{v.toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (v) => {
      let bg = 'rgba(255,255,255,0.05)';
      let color = '#fff';
      if (v === 'Max discount' || v === 'Discount applied') {
        bg = 'rgba(0, 230, 118, 0.1)';
        color = '#00e676';
      } else if (v === 'Stacked') {
        bg = 'rgba(61, 90, 255, 0.15)';
        color = '#8c9eff';
      } else if (v === 'No offer') {
        bg = 'rgba(255, 82, 82, 0.1)';
        color = '#ff5252';
      }
      return (
        <span
          style={{
            display: 'inline-block',
            fontSize: 9,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 6,
            background: bg,
            color,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {v}
        </span>
      );
    },
  },
];

// ── Styles ───────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    color: '#fff',
    fontFamily: 'var(--font-body)',
  },
  header: {
    background: 'rgba(20, 18, 15, 0.85)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid var(--border-glass)',
    padding: '1.25rem 2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logoTxt: {
    fontFamily: 'var(--font-heading)',
    fontSize: '20px',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  logoSpan: {
    color: 'var(--color-primary)',
    textShadow: '0 0 15px var(--color-primary-glow)',
  },
  headerSub: {
    fontSize: '10px',
    color: 'var(--text-sub)',
    textTransform: 'uppercase',
    letterSpacing: '0.1rem',
    fontWeight: '600',
  },
  main: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2.5rem 1.5rem',
  },
  section: {
    background: 'var(--bg-card)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--border-glass)',
    borderRadius: '12px',
    padding: '1.75rem',
    marginBottom: '2rem',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease',
  },
  sectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
    fontSize: '15px',
    color: '#fff',
    marginBottom: '1.25rem',
    paddingBottom: '4px',
    borderBottom: '2px solid var(--color-primary)',
    display: 'inline-block',
    letterSpacing: '0.02em',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.75rem',
    alignItems: 'start',
  },
  btn: {
    background: 'linear-gradient(135deg, var(--color-primary) 0%, #ff7a00 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '0.85rem 2.75rem',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    boxShadow: '0 4px 15px var(--color-primary-glow)',
  },
  btnDisabled: {
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '0.85rem 2.75rem',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'not-allowed',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  summaryContainer: {
    marginTop: '1.75rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid var(--border-glass)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--text-sub)',
  },
  summaryValue: {
    fontWeight: '600',
    color: '#fff',
  },
  cartOfferLabel: {
    fontSize: '13px',
    color: 'var(--color-success)',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cartOfferReasoning: {
    fontSize: '11px',
    color: 'var(--text-sub)',
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  cartOfferValue: {
    fontWeight: '700',
    color: 'var(--color-success)',
  },
  finalTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1rem',
    padding: '1.25rem 1.5rem',
    background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.08) 0%, rgba(20, 18, 15, 0.8) 100%)',
    border: '1px solid rgba(255, 85, 0, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(255, 85, 0, 0.1)',
  },
  finalTotalLabel: {
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    fontSize: '15px',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  finalTotalValue: {
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    fontSize: '32px',
    color: 'var(--color-primary)',
    textShadow: '0 0 20px var(--color-primary-glow)',
  },
  tabHeader: {
    display: 'flex',
    gap: '4px',
    marginBottom: '1.25rem',
    background: 'rgba(20, 18, 15, 0.5)',
    padding: '4px',
    borderRadius: '12px',
    border: '1px solid var(--border-glass)',
  },
  tabBtn: (active) => ({
    flex: 1,
    padding: '8px 12px',
    fontSize: '10px',
    fontWeight: '700',
    color: active ? '#fff' : 'var(--text-sub)',
    background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    transition: 'all 0.2s',
  }),
  pdfDropzone: {
    border: '2px dashed rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '1.75rem 1.25rem',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'rgba(20, 18, 15, 0.3)',
    transition: 'all 0.2s',
  },
};

// ── Component ────────────────────────────────────────────────────

export default function App() {
  const [rules, setRules] = useState([]);
  const [rulesErrors, setRulesErr] = useState([]);
  const [rulesFileName, setRulesFileName] = useState('');

  const [cartItems, setCartItems] = useState([]);
  const [cartErrors, setCartErrors] = useState([]);
  const [cartFileName, setCartFileName] = useState('');
  const [cartInputType, setCartInputType] = useState('csv'); // 'csv' | 'pdf'

  const [results, setResults] = useState(null);
  const [isPdfParsing, setIsPdfParsing] = useState(false);

  // ── Handlers ──

  function handleRulesLoad(csvText, fileName) {
    const { data, errors } = parseRulesCSV(csvText);
    setRules(data);
    setRulesErr(errors);
    setRulesFileName(fileName);
    setResults(null); // clear stale results
  }

  function handleCartLoad(csvText, fileName) {
    const { data, errors } = parseCartCSV(csvText);
    setCartItems(data);
    setCartErrors(errors);
    setCartFileName(fileName);
    setResults(null);
  }

  async function handlePdfUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setCartFileName(file.name);
    setCartErrors([]);
    setCartItems([]);
    setResults(null);
    setIsPdfParsing(true);

    try {
      const { data, errors } = await parseCartPdf(file);
      setCartItems(data);
      setCartErrors(errors);
    } catch (err) {
      console.error(err);
      setCartErrors([err.message || 'An error occurred while parsing the PDF cart.']);
    } finally {
      setIsPdfParsing(false);
    }
  }

  function handleAddNlRule(newRule) {
    let nextNum = 1;
    rules.forEach((r) => {
      const match = r.ruleId.match(/RULE-(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= nextNum) {
          nextNum = val + 1;
        }
      }
    });

    const ruleId = `RULE-${String(nextNum).padStart(2, '0')}`;
    const finalizedRule = {
      ...newRule,
      ruleId,
    };

    setRules((prevRules) => [...prevRules, finalizedRule]);
    setResults(null);
  }

  function handleCalculate() {
    const res = processCart(cartItems, rules);
    setResults(res);
  }

  const canCalculate = rules.length > 0 && cartItems.length > 0;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.logoTxt}>O<span style={S.logoSpan}>pp</span>tra</div>
        <div style={S.headerSub}>Discount Engine Dashboard</div>
      </div>

      <div style={S.main}>
        {/* Upload row */}
        <div className="responsive-grid">
          {/* Rules Section */}
          <div style={S.section} className="card-hover">
            <div style={S.sectionTitle}>Discount Rules</div>

            {/* Direct CSV Upload */}
            <div style={{ marginBottom: '1.25rem' }}>
              <CsvUploader
                label="Upload rules.csv"
                description="Upload standard CSV table for bulk rules"
                onLoad={handleRulesLoad}
                hasData={rules.length > 0 && !!rulesFileName}
                fileName={rulesFileName}
              />
            </div>

            {/* Natural Language Rules */}
            <NlRuleInput onAddRule={handleAddNlRule} />

            <ErrorBanner errors={rulesErrors} />

            {rules.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 6, fontWeight: '500' }}>
                  {rules.length} rule{rules.length > 1 ? 's' : ''} loaded
                </div>
                <DataTable columns={RULES_COLUMNS} rows={rules} />
              </div>
            )}
          </div>

          {/* Cart Items Section */}
          <div style={S.section} className="card-hover">
            <div style={S.sectionTitle}>Cart Items</div>

            {/* Input Selection Tab */}
            <div style={S.tabHeader}>
              <button
                style={S.tabBtn(cartInputType === 'csv')}
                onClick={() => {
                  setCartInputType('csv');
                  setCartItems([]);
                  setCartFileName('');
                  setCartErrors([]);
                  setResults(null);
                }}
              >
                CSV Upload
              </button>
              <button
                style={S.tabBtn(cartInputType === 'pdf')}
                onClick={() => {
                  setCartInputType('pdf');
                  setCartItems([]);
                  setCartFileName('');
                  setCartErrors([]);
                  setResults(null);
                }}
              >
                PDF Cart Invoice
              </button>
            </div>

            {/* Render CSV Uploader */}
            {cartInputType === 'csv' ? (
              <CsvUploader
                label="cart.csv"
                description="Upload standard shopping cart CSV"
                onLoad={handleCartLoad}
                hasData={cartItems.length > 0 && cartInputType === 'csv'}
                fileName={cartFileName}
              />
            ) : (
              /* Render PDF Uploader */
              <div
                style={{
                  ...S.pdfDropzone,
                  borderColor: cartItems.length > 0 ? 'rgba(0, 230, 118, 0.4)' : 'rgba(255, 255, 255, 0.15)',
                  background: cartItems.length > 0 ? 'rgba(0, 230, 118, 0.05)' : 'rgba(20, 18, 15, 0.3)',
                }}
                onClick={() => document.getElementById('pdf-file-input').click()}
              >
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={handlePdfUpload}
                />
                <span style={{ fontSize: 22, display: 'block', marginBottom: '4px' }}>
                  {isPdfParsing ? '🌀' : cartItems.length > 0 ? '🟢' : '📕'}
                </span>
                <span style={{ fontWeight: 700, fontSize: 13, display: 'block', color: '#fff' }}>
                  {isPdfParsing ? 'Analyzing Document...' : cartItems.length > 0 ? cartFileName : 'Upload Cart PDF'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', display: 'block' }}>
                  {cartItems.length > 0 ? 'Click to change document' : 'Upload invoice containing shopping table'}
                </span>
              </div>
            )}

            <ErrorBanner errors={cartErrors} />

            {cartItems.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 6, fontWeight: '500' }}>
                  {cartItems.length} item{cartItems.length > 1 ? 's' : ''} loaded
                </div>
                <DataTable columns={CART_COLUMNS} rows={cartItems} />
              </div>
            )}
          </div>
        </div>

        {/* Calculate button */}
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <button
            style={canCalculate ? S.btn : S.btnDisabled}
            onClick={handleCalculate}
            disabled={!canCalculate}
            className={canCalculate ? 'btn-hover' : ''}
          >
            Calculate Discounts
          </button>
          {!canCalculate && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              background: 'rgba(255, 85, 0, 0.05)',
              border: '1px solid rgba(255, 85, 0, 0.15)',
              color: 'var(--text-sub)',
              fontSize: '12px',
              marginTop: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              💡 Please load both discount rules and cart items to calculate.
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div style={{ ...S.section, borderLeft: '3px solid var(--color-primary)' }} className="card-hover">
            <div style={S.sectionTitle}>Calculated Cart Summary</div>
            <DataTable columns={RESULTS_COLUMNS} rows={results.itemResults} />

            <div style={S.summaryContainer}>
              <div style={S.summaryRow}>
                <span>Cart Subtotal (after item-level offers)</span>
                <span style={S.summaryValue}>Rs.{results.cartTotalBeforeOffer.toLocaleString('en-IN')}</span>
              </div>
              {results.appliedCartRule && (
                <div style={S.summaryRow}>
                  <span style={S.cartOfferLabel}>
                    🏷️ Cart Offer — {results.appliedCartRule.ruleId}
                    <span style={S.cartOfferReasoning}>({results.appliedCartRule.reasoning})</span>
                  </span>
                  <span style={S.cartOfferValue}>−Rs.{results.appliedCartRule.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={S.finalTotalRow}>
                <span style={S.finalTotalLabel}>Final Cart Total</span>
                <span style={S.finalTotalValue}>Rs.{results.finalCartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
