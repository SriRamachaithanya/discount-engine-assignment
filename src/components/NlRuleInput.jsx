/**
 * NlRuleInput.jsx
 *
 * Renders a natural language input for creating discount rules.
 * Handles parsing, confirmation states, optional API key management, and validation errors.
 */

import { useState, useEffect } from 'react';
import { parseLocalHeuristic, parseWithGemini } from '../engine/nlParser.js';

export default function NlRuleInput({ onAddRule }) {
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRule, setParsedRule] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('opptra_gemini_api_key') || '';
    setApiKey(savedKey);
  }, []);

  function handleSaveApiKey(val) {
    setApiKey(val);
    localStorage.setItem('opptra_gemini_api_key', val);
  }

  async function handleParse() {
    if (!inputText.trim()) return;
    setIsParsing(true);
    setErrorMsg('');
    setParsedRule(null);

    try {
      let result;
      if (apiKey.trim()) {
        result = await parseWithGemini(inputText, apiKey.trim());
      } else {
        result = parseLocalHeuristic(inputText);
      }

      if (result.isAmbiguous) {
        setErrorMsg(result.ambiguityExplanation || 'The input rule is ambiguous. Please be more specific.');
      } else {
        setParsedRule(result);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to parse the rule. Please check your network connection or try again.');
    } finally {
      setIsParsing(false);
    }
  }

  function handleConfirm() {
    if (!parsedRule) return;
    onAddRule(parsedRule);
    setParsedRule(null);
    setInputText('');
  }

  function handleDiscard() {
    setParsedRule(null);
    setErrorMsg('');
  }

  // Styles matching the premium glassmorphism theme
  const styles = {
    card: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '1.25rem',
      color: '#fff',
      marginBottom: '1rem',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
    },
    titleRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.75rem',
    },
    title: {
      fontFamily: 'Outfit, Georgia, sans-serif',
      fontSize: '15px',
      fontWeight: '600',
      color: '#fff',
      margin: 0,
      background: 'linear-gradient(135deg, #FF6B00 0%, #FF8A00 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    apiLink: {
      fontSize: '11px',
      color: '#aaa',
      cursor: 'pointer',
      textDecoration: 'underline',
      transition: 'color 0.2s',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      marginBottom: '0.75rem',
    },
    inputRow: {
      display: 'flex',
      gap: '0.5rem',
    },
    input: {
      flex: 1,
      background: 'rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '0.6rem 0.8rem',
      fontSize: '12px',
      color: '#fff',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    apiKeyInput: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '8px',
      padding: '0.4rem 0.6rem',
      fontSize: '11px',
      color: '#fff',
      outline: 'none',
      width: '100%',
    },
    btn: {
      background: 'linear-gradient(135deg, #FF5800 0%, #FF7A00 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '0.5rem 1.2rem',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'transform 0.1s, opacity 0.2s',
    },
    btnSec: {
      background: 'rgba(255, 255, 255, 0.1)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '0.5rem 1rem',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background 0.2s',
    },
    btnSecHover: {
      background: 'rgba(255, 255, 255, 0.15)',
    },
    desc: {
      fontSize: '11px',
      color: 'rgba(255, 255, 255, 0.6)',
      margin: '0.2rem 0 0 0',
      lineHeight: '1.4',
    },
    errorBox: {
      background: 'rgba(239, 83, 80, 0.1)',
      border: '1px solid rgba(239, 83, 80, 0.3)',
      borderRadius: '8px',
      padding: '0.75rem',
      marginTop: '0.75rem',
      fontSize: '12px',
      color: '#ef5350',
      lineHeight: '1.4',
    },
    errorTitle: {
      fontWeight: '700',
      marginBottom: '0.25rem',
    },
    confirmBox: {
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px dashed rgba(255, 255, 255, 0.15)',
      borderRadius: '8px',
      padding: '0.85rem',
      marginTop: '0.75rem',
    },
    confirmGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.6rem 1rem',
      fontSize: '12px',
      marginBottom: '0.85rem',
    },
    confirmLabel: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '11px',
    },
    confirmValue: {
      color: '#fff',
      fontWeight: '600',
      marginTop: '2px',
    },
    tag: (bg, color) => ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '700',
      background: bg || 'rgba(255,255,255,0.1)',
      color: color || '#fff',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }),
  };

  return (
    <div style={styles.card}>
      <div style={styles.titleRow}>
        <h4 style={styles.title}>Natural Language Rules</h4>
        <span
          style={styles.apiLink}
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
        >
          {showApiKeyInput ? 'Hide API Key Settings' : 'Configure Gemini API Key'}
        </span>
      </div>

      {showApiKeyInput && (
        <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
          <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
            Gemini API Key (stored locally, optional)
          </label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => handleSaveApiKey(e.target.value)}
            style={styles.apiKeyInput}
          />
          <p style={{ ...styles.desc, fontSize: '10px', marginTop: '4px' }}>
            If omitted, standard English rules will be parsed locally via regex heuristics.
          </p>
        </div>
      )}

      {!parsedRule ? (
        <div style={styles.inputGroup}>
          <div style={styles.inputRow}>
            <input
              type="text"
              placeholder="e.g. 20% off for Natura Casa brand, stackable with other offers"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleParse()}
              disabled={isParsing}
              style={styles.input}
            />
            <button
              onClick={handleParse}
              disabled={isParsing || !inputText.trim()}
              style={{ ...styles.btn, opacity: isParsing || !inputText.trim() ? 0.6 : 1 }}
            >
              {isParsing ? 'Parsing...' : 'Parse'}
            </button>
          </div>
          <p style={styles.desc}>
            Describe rules like: "Rs.100 flat discount on Flipkart", "10% off if cart value is more than Rs.5,000".
          </p>
        </div>
      ) : (
        <div style={styles.confirmBox}>
          <div style={{ ...styles.title, fontSize: '12px', marginBottom: '0.6rem' }}>
            Confirm Parsed Discount Rule
          </div>
          <div style={styles.confirmGrid}>
            <div>
              <div style={styles.confirmLabel}>Scope</div>
              <div style={styles.confirmValue}>
                <span style={styles.tag('rgba(255, 255, 255, 0.1)', '#fff')}>
                  {parsedRule.scope}
                </span>
              </div>
            </div>
            {parsedRule.scope !== 'cart' && (
              <div>
                <div style={styles.confirmLabel}>Applies To</div>
                <div style={styles.confirmValue}>{parsedRule.appliesTo || '—'}</div>
              </div>
            )}
            <div>
              <div style={styles.confirmLabel}>Discount Value</div>
              <div style={{ ...styles.confirmValue, color: '#4caf50' }}>
                {parsedRule.type === 'percentage' ? `${parsedRule.value}% off` : `Rs.${parsedRule.value} off`}
              </div>
            </div>
            <div>
              <div style={styles.confirmLabel}>Stackable</div>
              <div style={styles.confirmValue}>
                <span style={styles.tag(parsedRule.stackable ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)', parsedRule.stackable ? '#4caf50' : '#f44336')}>
                  {parsedRule.stackable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            {parsedRule.scope === 'cart' && (
              <div style={{ gridColumn: 'span 2' }}>
                <div style={styles.confirmLabel}>Minimum Cart Value</div>
                <div style={styles.confirmValue}>Rs.{parsedRule.minCartValue.toLocaleString('en-IN')}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={handleDiscard} style={styles.btnSec}>
              Discard
            </button>
            <button onClick={handleConfirm} style={styles.btn}>
              Confirm & Add Rule
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={styles.errorBox}>
          <div style={styles.errorTitle}>Parsing Issue</div>
          <div>{errorMsg}</div>
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleDiscard} style={{ ...styles.btnSec, padding: '2px 10px', fontSize: '10px' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
