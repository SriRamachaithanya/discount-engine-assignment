/**
 * discountEngine.js
 *
 * Pure discount calculation logic. No UI, no side effects.
 * All functions take plain objects and return plain objects.
 *
 * Data shapes:
 *
 * DiscountRule {
 *   ruleId:    string       — e.g. "RULE-01"
 *   scope:     "brand" | "platform"
 *   appliesTo: string       — e.g. "Natura Casa", "Amazon India"
 *   type:      "percentage" | "flat"
 *   value:     number       — percentage as integer (15 = 15%), flat in rupees
 *   stackable: boolean
 * }
 *
 * CartItem {
 *   itemId:    string       — e.g. "ITEM-01"
 *   product:   string
 *   brand:     string
 *   platform:  string
 *   basePrice: number       — in rupees
 * }
 *
 * DiscountResult {
 *   itemId:        string
 *   product:       string
 *   brand:         string
 *   platform:      string
 *   basePrice:     number
 *   finalPrice:    number
 *   totalDiscount: number
 *   appliedRules:  string[]
 *   skippedRules:  string[]
 *   reasoning:     string   — customer-readable explanation
 * }
 */

/**
 * Returns true if the rule applies to this cart item.
 */
export function ruleMatchesItem(item, rule) {
  const normalise = (s) => s.trim().toLowerCase()
  if (rule.scope === 'brand') {
    return normalise(item.brand) === normalise(rule.appliesTo)
  }
  if (rule.scope === 'platform') {
    return normalise(item.platform) === normalise(rule.appliesTo)
  }
  return false
}

/**
 * Calculates the rupee discount a rule gives on a given price.
 * Uses the provided price, not the original base price — important for stacking.
 */
export function calculateDiscountAmount(price, rule) {
  if (rule.type === 'percentage') {
    return Math.round(price * rule.value / 100)
  }
  if (rule.type === 'flat') {
    return rule.value
  }
  return 0
}

/**
 * Builds the customer-facing reasoning string for an applied rule.
 */
function ruleToReasoning(rule) {
  const scopeLabel = rule.scope === 'brand' ? 'Brand' : 'Platform'
  if (rule.type === 'percentage') {
    return `${scopeLabel} offer: ${rule.value}% off`
  }
  if (rule.type === 'flat') {
    return `${scopeLabel} offer: Rs.${rule.value} off`
  }
  return `${scopeLabel} offer applied`
}

/**
 * Applies the active discount rules to a single cart item.
 * Returns a DiscountResult.
 *
 * Logic:
 *   1. Find all rules that match this item.
 *   2. Among non-stackable rules, pick the one giving the largest discount.
 *   3. Apply any stackable rules on top of that price.
 *   4. Build the reasoning string from what was applied.
 */
export function applyDiscounts(item, rules) {
  // Only match item-level rules
  const matchingRules = rules.filter((r) => r.scope !== 'cart' && ruleMatchesItem(item, r))

  // No rules match — return base price with explanation
  if (matchingRules.length === 0) {
    return {
      itemId: item.itemId,
      product: item.product,
      brand: item.brand,
      platform: item.platform,
      basePrice: item.basePrice,
      finalPrice: item.basePrice,
      totalDiscount: 0,
      appliedRules: [],
      skippedRules: [],
      reasoning: 'No rules match',
      status: 'No offer',
    }
  }

  const nonStackable = matchingRules.filter((r) => !r.stackable)
  const stackable = matchingRules.filter((r) => r.stackable)

  // Pick the non-stackable rule that gives the largest saving on base price
  let winner = null
  let skipped = []
  let nonStackableSavings = []

  if (nonStackable.length > 0) {
    nonStackableSavings = nonStackable.map(r => ({
      rule: r,
      saving: calculateDiscountAmount(item.basePrice, r)
    })).sort((a, b) => b.saving - a.saving)

    winner = nonStackableSavings[0].rule
    skipped = nonStackableSavings.slice(1).map(x => x.rule)
  }

  // Apply winner first, then stack on top
  let price = item.basePrice
  const appliedRules = []
  let winnerSaving = 0

  if (winner) {
    winnerSaving = calculateDiscountAmount(price, winner)
    price -= winnerSaving
    appliedRules.push(winner.ruleId)
  }

  const appliedStackables = []
  for (const rule of stackable) {
    const stackableSaving = calculateDiscountAmount(price, rule)
    price -= stackableSaving
    appliedRules.push(rule.ruleId)
    appliedStackables.push({ rule, saving: stackableSaving })
  }

  const finalPrice = Math.round(price)

  // Construct detailed reasoning and status
  let status = 'Discount applied'
  let reasoning = ''

  if (appliedRules.length > 1) {
    status = 'Stacked'
    const parts = []
    if (winner) {
      const savingsStr = winner.type === 'percentage' ? `-${winner.value}%` : `-Rs.${winnerSaving}`
      parts.push(`${winner.ruleId} (-Rs.${winnerSaving})`)
    }
    appliedStackables.forEach((as, idx) => {
      const valueStr = as.rule.type === 'percentage' ? `${as.rule.value}% off` : `Rs.${as.rule.value} off`
      const amtStr = as.rule.type === 'percentage' ? `-${as.rule.value}%` : `-Rs.${as.saving}`
      if (!winner && idx === 0) {
        parts.push(`${as.rule.ruleId} (${valueStr}, stackable)`)
      } else {
        parts.push(`${as.rule.ruleId} stacked (${amtStr})`)
      }
    })
    reasoning = parts.join(' + ')
  } else if (winner) {
    if (nonStackableSavings.length > 1) {
      status = 'Max discount'
      const topSaving = nonStackableSavings[0].saving
      const runnerUpSaving = nonStackableSavings[1].saving
      reasoning = `${winner.ruleId} wins (Rs.${topSaving} saving > Rs.${runnerUpSaving})`
    } else {
      status = 'Discount applied'
      const valueStr = winner.type === 'percentage' ? `${winner.value}% off` : `Rs.${winner.value} off`
      reasoning = `${winner.ruleId} (${valueStr})`
    }
  } else if (appliedStackables.length === 1) {
    status = 'Discount applied'
    const as = appliedStackables[0]
    const valueStr = as.rule.type === 'percentage' ? `${as.rule.value}% off` : `Rs.${as.rule.value} off`
    reasoning = `${as.rule.ruleId} (${valueStr}, stackable)`
  }

  return {
    itemId: item.itemId,
    product: item.product,
    brand: item.brand,
    platform: item.platform,
    basePrice: item.basePrice,
    finalPrice,
    totalDiscount: item.basePrice - finalPrice,
    appliedRules,
    skippedRules: skipped.map((r) => r.ruleId),
    reasoning,
    status,
  }
}

/**
 * Runs applyDiscounts across every item in the cart.
 * Returns { itemResults, cartTotalBeforeOffer, appliedCartRule, finalCartTotal }
 */
export function processCart(cartItems, rules) {
  const itemResults = cartItems.map((item) => applyDiscounts(item, rules))
  const itemSubtotal = itemResults.reduce((sum, r) => sum + r.finalPrice, 0)

  // Find applicable cart-level rules
  const applicableCartRules = rules
    .filter((r) => r.scope === 'cart' && itemSubtotal >= r.minCartValue)
    .map((r) => {
      const discountAmount = r.type === 'percentage'
        ? Math.round(itemSubtotal * r.value / 100)
        : r.value
      return { rule: r, discountAmount }
    })
    .sort((a, b) => b.discountAmount - a.discountAmount)

  let appliedCartRule = null
  let finalCartTotal = itemSubtotal

  if (applicableCartRules.length > 0) {
    const winner = applicableCartRules[0]
    const offerValStr = winner.rule.type === 'percentage' ? `${winner.rule.value}% off` : `Rs.${winner.rule.value} off`
    appliedCartRule = {
      ruleId: winner.rule.ruleId,
      discountAmount: winner.discountAmount,
      reasoning: `Rs.${itemSubtotal.toLocaleString('en-IN')} ≥ Rs.${winner.rule.minCartValue.toLocaleString('en-IN')} → ${offerValStr} entire cart → −Rs.${winner.discountAmount.toLocaleString('en-IN')}`
    }
    finalCartTotal = itemSubtotal - winner.discountAmount
  }

  return {
    itemResults,
    cartTotalBeforeOffer: itemSubtotal,
    appliedCartRule,
    finalCartTotal
  }
}

/**
 * Sums the final prices across all results, or returns the computed final cart total.
 */
export function cartTotal(results) {
  if (results && results.finalCartTotal !== undefined) {
    return results.finalCartTotal
  }
  if (Array.isArray(results)) {
    return results.reduce((sum, r) => sum + r.finalPrice, 0)
  }
  return 0
}
