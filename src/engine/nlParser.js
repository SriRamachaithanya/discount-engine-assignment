/**
 * nlParser.js
 *
 * Parses natural language input describing discount rules.
 * Uses a hybrid approach:
 * 1. Heuristic local regex parsing (no API key needed, covers standard patterns).
 * 2. Real Gemini API call (requires an API key, handles arbitrary English sentences).
 */

const KNOWN_BRANDS = ['natura casa', 'livspace pro', 'nordic basics'];
const KNOWN_PLATFORMS = ['amazon india', 'amazon', 'flipkart', 'noon'];

/**
 * Attempts to parse the input rule using local regex patterns.
 */
export function parseLocalHeuristic(text) {
  const t = text.trim();
  const lower = t.toLowerCase();

  // 1. Detect Value and Type
  let type = null;
  let value = 0;

  // Percentage pattern: "20% off", "10 percent off", etc.
  const pctMatch = t.match(/(\d+(?:\.\d+)?)\s*%/i) || t.match(/(\d+(?:\.\d+)?)\s*percent/i);
  // Flat pattern: "Rs.150 off", "Rs 150", "150 rupees", "100 flat", "flat 100", "Rs 100 off"
  const flatMatch = t.match(/Rs\.?\s*(\d+(?:,\d+)*)/i) || 
                    t.match(/flat\s+(\d+(?:,\d+)*)/i) ||
                    t.match(/(\d+(?:,\d+)*)\s*flat/i) || 
                    t.match(/(\d+(?:,\d+)*)\s*rupee/i) ||
                    t.match(/rs\.?\s*(\d+(?:,\d+)*)\s*off/i);

  if (pctMatch) {
    type = 'percentage';
    value = parseFloat(pctMatch[1]);
  } else if (flatMatch) {
    type = 'flat';
    value = parseFloat(flatMatch[1].replace(/,/g, ''));
  }

  // 2. Detect Scope and AppliesTo
  let scope = null;
  let appliesTo = '';
  let minCartValue = 0;

  // Check for cart scope
  const isCartScope = lower.includes('cart') || lower.includes('order') || lower.includes('total');
  
  if (isCartScope) {
    scope = 'cart';
    const minCartMatch = t.match(/(?:cart|order)(?:\s+value|\s+total)?\s*(?:is\s+more\s+than|is\s+greater\s+than|>=|>\s*|exceeds|above)\s*(?:Rs\.?\s*)?([\d,]+)/i) ||
                         t.match(/(?:more|greater)\s+than\s*(?:Rs\.?\s*)?([\d,]+)/i);
    if (minCartMatch) {
      minCartValue = parseFloat(minCartMatch[1].replace(/,/g, ''));
    }
  } else {
    // Check known brands first
    const brandMatch = KNOWN_BRANDS.find(b => lower.includes(b));
    if (brandMatch) {
      scope = 'brand';
      // Format nicely to match database capitalization
      appliesTo = brandMatch === 'natura casa' ? 'Natura Casa' :
                  brandMatch === 'livspace pro' ? 'LivSpace Pro' : 'Nordic Basics';
    } else {
      // Check known platforms
      const platformMatch = KNOWN_PLATFORMS.find(p => lower.includes(p));
      if (platformMatch) {
        scope = 'platform';
        appliesTo = platformMatch === 'amazon india' ? 'Amazon India' :
                    platformMatch === 'amazon' ? 'Amazon' :
                    platformMatch === 'flipkart' ? 'Flipkart' : 'Noon';
      } else {
        // Fallback: try extraction using indicators
        const brandExtractor = t.match(/for\s+([\w\s]+?)\s+brand/i) || t.match(/brand\s+([\w\s]+)/i);
        const platformExtractor = t.match(/on\s+all\s+([\w\s]+?)\s+items/i) || 
                                  t.match(/on\s+([\w\s]+?)\s+platform/i) ||
                                  t.match(/on\s+([\w\s]+)/i);
        
        if (brandExtractor) {
          scope = 'brand';
          appliesTo = brandExtractor[1].trim();
        } else if (platformExtractor) {
          scope = 'platform';
          appliesTo = platformExtractor[1].trim();
        }
      }
    }
  }

  // 3. Detect Stackable
  const stackable = lower.includes('stackable') || lower.includes('stack') || lower.includes('on top');

  // 4. Ambiguity / Validation checks
  if (!type || value <= 0) {
    return {
      isAmbiguous: true,
      ambiguityExplanation: 'Could not determine the discount value. Please specify a percentage (e.g., "10% off") or flat amount (e.g., "Rs.150 off").'
    };
  }

  if (scope === 'cart' && minCartValue <= 0) {
    return {
      isAmbiguous: true,
      ambiguityExplanation: 'Could not determine the minimum cart threshold. Please specify a threshold value (e.g., "if cart value is more than Rs.5,000").'
    };
  }

  if (!scope && !appliesTo) {
    return {
      isAmbiguous: true,
      ambiguityExplanation: 'Could not determine where this rule applies. Please specify if it applies to a brand (e.g., "for Natura Casa brand"), platform (e.g., "on Flipkart items"), or the cart.'
    };
  }

  // If scope is platform or brand but appliesTo is still empty, mark ambiguous
  if ((scope === 'platform' || scope === 'brand') && !appliesTo) {
    return {
      isAmbiguous: true,
      ambiguityExplanation: `Could not determine which specific ${scope} this rule applies to. Please name it clearly.`
    };
  }

  return {
    ruleId: 'RULE-TEMP',
    scope,
    appliesTo,
    type,
    value,
    stackable,
    minCartValue,
    isAmbiguous: false,
    ambiguityExplanation: ''
  };
}

/**
 * Parses the input rule using the Gemini API if an API key is available.
 */
export async function parseWithGemini(text, apiKey) {
  const systemPrompt = `
You are a precise parsing engine for a retail discount calculator.
Your job is to parse a natural language discount rule description into a JSON object matching the following structure.

JSON Schema:
{
  "ruleId": "RULE-TEMP",
  "scope": "brand" | "platform" | "cart",
  "appliesTo": string (e.g., "Natura Casa", "Flipkart", or "" for cart scope),
  "type": "percentage" | "flat",
  "value": number (numeric value, e.g. 20 for 20%, 150 for Rs.150 flat),
  "stackable": boolean,
  "minCartValue": number (minimum cart value threshold for cart-level rules, otherwise 0),
  "isAmbiguous": boolean (set to true if the input is vague, missing a discount value, or missing a threshold/applies_to),
  "ambiguityExplanation": string (if isAmbiguous is true, explain what is missing or unclear so the user can correct it)
}

Rule parsing guidelines:
- Scope:
  - "brand" if the discount applies to a specific brand (e.g., "Natura Casa", "Nordic Basics", "LivSpace Pro").
  - "platform" if it applies to a platform (e.g., "Flipkart", "Amazon India", "Noon").
  - "cart" if it applies to the entire cart total (e.g., "if cart value is more than Rs.5,000").
- Type: "percentage" (e.g. "10% off") or "flat" (e.g. "Rs.100 flat discount").
- Value: The numeric discount amount.
- Stackable: True if it mentions "stackable", "can stack", "applies on top of other offers", "on top". Defaults to false.
- Min Cart Value: Set this for "cart" scope rules based on the threshold mentioned.
- Ambiguous rules:
  - If a rule doesn't specify a discount value (e.g. "Give a discount for big orders"), mark isAmbiguous as true.
  - If a rule doesn't specify which brand/platform it applies to or what the cart value threshold is, mark isAmbiguous as true.

Examples:
- "20% off for Natura Casa brand, stackable with other offers" ->
  {"scope": "brand", "appliesTo": "Natura Casa", "type": "percentage", "value": 20, "stackable": true, "minCartValue": 0, "isAmbiguous": false, "ambiguityExplanation": ""}
- "Rs.100 flat discount on all Flipkart items" ->
  {"scope": "platform", "appliesTo": "Flipkart", "type": "flat", "value": 100, "stackable": false, "minCartValue": 0, "isAmbiguous": false, "ambiguityExplanation": ""}
- "10% off if cart value is more than Rs.5,000" ->
  {"scope": "cart", "appliesTo": "", "type": "percentage", "value": 10, "stackable": false, "minCartValue": 5000, "isAmbiguous": false, "ambiguityExplanation": ""}
- "Give a discount for big orders" ->
  {"isAmbiguous": true, "ambiguityExplanation": "The input is missing a discount value (e.g., 10% or Rs.100) and does not specify what constitutes a 'big order' (minimum cart threshold)."}

Return ONLY the raw JSON object. Do not wrap it in markdown block tags.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: `Input text to parse: "${text}"` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const json = await response.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Empty response from Gemini API');
    }

    return JSON.parse(candidateText.trim());
  } catch (error) {
    console.error('Gemini API call failed, falling back to local parser:', error);
    // Fallback to local heuristic parser if API call fails
    return parseLocalHeuristic(text);
  }
}
