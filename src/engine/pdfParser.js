/**
 * pdfParser.js
 *
 * Client-side utility for extracting cart items from a PDF invoice/cart table.
 * Uses PDF.js to extract text and reconstruct columns based on coordinate geometry.
 */

export async function parseCartPdf(file) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js library is not loaded. Verify the script is present in index.html.');
  }

  const arrayBuffer = await file.arrayBuffer();
  // Get document
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let textLines = [];

  // Iterate over pages
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by Y coordinate (rounded to the nearest 0.5 to handle slight baseline offsets)
    const linesMap = {};
    for (const item of textContent.items) {
      const y = Math.round(item.transform[5] * 2) / 2; // Y position is index 5 in the transform matrix
      if (!linesMap[y]) {
        linesMap[y] = [];
      }
      linesMap[y].push(item);
    }

    // Sort lines from top to bottom (Y descending)
    const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);

    for (const y of sortedY) {
      // Sort items inside the line from left to right (X ascending, index 4 in transform matrix)
      const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
      const lineText = lineItems.map(item => item.str).join(' ').trim();
      if (lineText) {
        textLines.push(lineText);
      }
    }
  }

  const data = [];
  const errors = [];

  // Filter out headers, dividers, metadata
  const dataLines = textLines.filter(line => {
    const l = line.toLowerCase();
    if (l.includes('───') || l.includes('===') || l.includes('___')) return false;
    if (l.includes('product') && l.includes('brand') && l.includes('platform') && l.includes('base price')) return false;
    if (l.includes('order #') || l.includes('date:')) return false;
    return true;
  });

  const KNOWN_BRANDS = ['natura casa', 'livspace pro', 'nordic basics'];
  const KNOWN_PLATFORMS = ['amazon india', 'amazon', 'flipkart', 'noon'];

  dataLines.forEach((line, index) => {
    const rowNum = index + 1;

    // Base price is always a number with optional commas, currency symbols, at the end of the line
    const priceMatch = line.match(/(?:Rs\.?\s*)?([\d,]+)(?:\.00)?\s*$/i);
    if (!priceMatch) {
      errors.push(`Row ${rowNum}: Could not extract base price from line: "${line}"`);
      return;
    }

    const priceVal = parseFloat(priceMatch[1].replace(/,/g, ''));
    if (isNaN(priceVal) || priceVal <= 0) {
      errors.push(`Row ${rowNum}: Base price must be a positive number, got "${priceMatch[1]}"`);
      return;
    }

    // Strip the price off to parse the rest
    const remaining = line.substring(0, line.lastIndexOf(priceMatch[0])).trim();
    const lowerRemaining = remaining.toLowerCase();

    let product = '';
    let brand = '';
    let platform = '';

    // 1. Locate platform
    let platformIndex = -1;
    let platformLength = 0;
    for (const p of KNOWN_PLATFORMS) {
      const idx = lowerRemaining.lastIndexOf(p);
      if (idx !== -1 && idx > platformIndex) {
        platformIndex = idx;
        platformLength = p.length;
        platform = p === 'amazon india' ? 'Amazon India' : 
                   p === 'amazon' ? 'Amazon' :
                   p === 'flipkart' ? 'Flipkart' : 'Noon';
      }
    }

    // 2. Locate brand (occurs before platform or near end)
    let brandIndex = -1;
    let brandLength = 0;
    for (const b of KNOWN_BRANDS) {
      const idx = lowerRemaining.lastIndexOf(b);
      if (idx !== -1 && (platformIndex === -1 || idx < platformIndex)) {
        if (idx > brandIndex) {
          brandIndex = idx;
          brandLength = b.length;
          brand = b === 'natura casa' ? 'Natura Casa' :
                  b === 'livspace pro' ? 'LivSpace Pro' : 'Nordic Basics';
        }
      }
    }

    // 3. Segment remainder
    if (platformIndex !== -1 && brandIndex !== -1) {
      product = remaining.substring(0, brandIndex).trim();
    } else if (brandIndex !== -1) {
      product = remaining.substring(0, brandIndex).trim();
      platform = remaining.substring(brandIndex + brandLength).trim();
    } else if (platformIndex !== -1) {
      const left = remaining.substring(0, platformIndex).trim();
      const lastSpace = left.lastIndexOf(' ');
      if (lastSpace !== -1) {
        product = left.substring(0, lastSpace).trim();
        brand = left.substring(lastSpace).trim();
      } else {
        product = left;
        brand = '';
      }
    } else {
      // Split by double-spaces or fallback
      const parts = remaining.split(/\s{2,}/);
      if (parts.length >= 3) {
        product = parts[0].trim();
        brand = parts[1].trim();
        platform = parts.slice(2).join(' ').trim();
      } else {
        const words = remaining.split(' ');
        if (words.length >= 4) {
          const lastTwo = words.slice(-2).join(' ').toLowerCase();
          if (lastTwo === 'amazon india') {
            platform = 'Amazon India';
            const leftWords = words.slice(0, -2);
            brand = leftWords.slice(-1).join(' ');
            product = leftWords.slice(0, -1).join(' ');
          } else {
            platform = words[words.length - 1];
            brand = words[words.length - 2];
            product = words.slice(0, -2).join(' ');
          }
        } else {
          errors.push(`Row ${rowNum}: Unable to align columns. Raw text: "${remaining}"`);
          return;
        }
      }
    }

    // Strip punctuation
    product = product.replace(/[,;]/g, '').trim();
    brand = brand.replace(/[,;]/g, '').trim();
    platform = platform.replace(/[,;]/g, '').trim();

    if (!product) product = 'Unknown Item';
    if (!brand) brand = 'Unknown Brand';
    if (!platform) platform = 'Unknown Platform';

    data.push({
      itemId: `ITEM-${String(data.length + 1).padStart(2, '0')}`,
      product,
      brand,
      platform,
      basePrice: Math.round(priceVal)
    });
  });

  if (data.length === 0 && errors.length === 0) {
    errors.push('No parseable shopping cart rows found in document.');
  }

  return { data, errors };
}
