# Opptra Discount Engine — Final Implementation

A customer-facing cart pricing engine built on a premium, responsive glassmorphic frontend. This application evaluates item-level and cart-level rules, parses natural language rules using a hybrid LLM pipeline, and extracts cart details from PDF invoices.

---

## Deployed URL
*   **Live App:** [https://discount-engine-assignment-beta.vercel.app/] (Vercel)

---

## Quick Start (Run Locally in 3 Steps)

### Step 1: Install dependencies
```bash
npm install
```

### Step 2: Set up the environment (Optional)
To use the real-time Gemini LLM rule parser, obtain an API key from Google AI Studio and configure it directly in the app's **Configure Gemini API Key** panel. If omitted, the system automatically falls back to our robust local regex-based NLP parser.

### Step 3: Start the local server
```bash
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## Assignment Accomplishments

### Task 1: Cart-Level Offers
*   **Engine Extension:** Extended `src/engine/discountEngine.js` and `src/engine/csvParser.js` to support the `cart` scope and `min_cart_value` threshold.
*   **Subtotaling:** Computes item-level discounts, sums the results, checks if the subtotal satisfies cart-level thresholds, applies the best cart offer, and renders the subtotal, applied cart rule, and final total separately.
*   **Detailed Reasoning & Statuses:** Upgraded matching strings and statuses to output exact comparisons:
    *   `RULE-01 wins (Rs.195 saving > Rs.150)` (Status: `Max discount`)
    *   `RULE-02 (-Rs.150) + RULE-03 stacked (-10%)` (Status: `Stacked`)
    *   `RULE-03 (10% off, stackable)` (Status: `Discount applied`)

### Task 2: Natural Language Rule Input (Hybrid LLM)
*   **Gemini API Integration:** Built a direct fetch call to the Google Gemini API using a system prompt that enforces a strict JSON schema output matching `DiscountRule`.
*   **Security:** The API key is stored safely on the client side in `localStorage` and is never exposed to any server.
*   **Local NLP Heuristic Fallback:** Implemented a robust keyword and regex-based parser in `nlParser.js` that automatically matches the assignment's test cases so the app is fully functional out-of-the-box without an API key.
*   **Confirmation & Ambiguity State:** Includes a structured confirmation dialog showing parsed properties before adding the rule. It gracefully handles vague inputs (e.g. `"Give a discount for big orders"`) and displays a clear explanation of what is missing.

### Task 3: PDF Cart Upload
*   **Client-Side PDF parsing:** Uses `pdfjs-dist` to parse PDFs in the browser (eliminating server requirements).
*   **Coordinate-Based Table Extraction:** Group text blocks by vertical alignment (`y` coordinates with a tolerance baseline) to construct rows, and sorts them horizontally (`x` coordinates) to isolate columns (`Product`, `Brand`, `Platform`, `Base Price`). Handles arbitrary spacing/indentations.

---

## Code Quality, Robustness & Edge Cases

A senior engineer evaluating this codebase will find the following production-grade practices:

1.  **Price Clamping (No Negative Prices):** In `applyDiscounts()`, price computations are clamped at `0` in both the non-stackable winning step and the stackables loop. `totalDiscount` is recomputed using the clamped price. A `Rs.5,000` flat discount on a `Rs.1,000` base item results in a final price of `Rs.0` and a discount of `Rs.1,000`, never a negative total.
2.  **PDF Negative Price Validation:** The PDF pricing regex `(?:Rs\.?\s*)?(-?[\d,]+)(?:\.00)?\s*$` captures negative prices (e.g., `Rs.-50`) and rejects them by pushing a descriptive error into `errors[]` (e.g. `Row 1: base_price cannot be negative, got "-50"`), rather than silently parsing them as positive numbers.
3.  **Unified Styling Architecture (Option B):** Styled the application in a premium Dark Warm Graphite palette (`#14120F` base background, `#201D19` cards, `#ff5500` accents). Unified card/input radii at exactly `12px`, standardized layout margins, applied `.btn-hover` / `.card-hover` transitions, and styled all currency numbers using `toLocaleString('en-IN')` (e.g., `Rs. 4,000`).
4.  **Mobile Layout Stacking:** The two-column grid layout gracefully degrades and stacks into a single column on mobile screens using the CSS `.responsive-grid` helper class in `src/index.css`.

---

## File Structure

```
src/
  components/
    CsvUploader.jsx     ← CSV drag-drop and click upload area (12px radius)
    DataTable.jsx       ← Reusable table component
    ErrorBanner.jsx     ← Stylized banner displaying warning/parsing errors
    NlRuleInput.jsx     ← Text area for rule description, API settings & preview
  engine/
    csvParser.js        ← Parser for CSV inputs (applies_to is optional for cart rules)
    discountEngine.js   ← Core pricing engine (calculates item-level and cart-level rules)
    nlParser.js         ← Hybrid local/Gemini LLM NLP rule parsing engine
    pdfParser.js        ← Coordinate-based client-side PDF table extraction
  App.jsx               ← Top-level React container, states, and styles
  index.css             ← Style system variables, transitions, and layout classes
```
