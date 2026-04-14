/**
 * Pricing Engine — exact replication of Google Sheets Main tab
 *
 * Verified against real Quotation sheet:
 *   Bakery > Brownie 1, qty=10, SBS ITC 280GSM, Four Colour, Lam Thermal, Varnish addon
 *   Real price: ₹648.32/unit ✓
 *
 * FORMULA:
 *   sheetQty = ceil(qty/ups) + 80
 *
 *   X2 (Printing) = LOOKUP(sheetQty, qty_ranges, print_col) × colourFactor + MIN_PRINT
 *     MIN_PRINT: machine 1926=1000, 2029=1100, 2840=2600
 *     print_col: machine 1926=AC, 2029=AG, 2840=AH
 *
 *   Z2 (Die) = LOOKUP(sheetQty, qty_ranges, AE_col) × dieCuttingFlag
 *     AE col = Dangler Making rate (0.25/sheet ≤5080, 0.20 above)
 *
 *   AE2 = ROUNDUP(designing + Z2 + leafing + window + pastingRate)
 *
 *   AD2 = ROUNDUP((qty×window×1.05) + MAX(sheetQty×ups×pastingRate, 200) + 1)
 *
 *   P2 (Paper) = ROUNDUP(((W×H)/1550)×(GSM/1000)×(CC5+2)×sheetQty + (sheetQty/144)×15)
 *     CC5 = material rate per 1000 sheets (brand-specific)
 *
 *   AG2 (base per unit) = (P2 + AE2 + X2 + AD2) / qty
 *
 *   Lamination per unit:
 *     Standard: MAX((W×H×rate×sheetQty)/qty, 300/qty)
 *     UV Flat:  MAX((W×H×0.0025×sheetQty)/qty + 350/qty, 500/qty)
 *     UV Hybrid:MAX((W×H×0.0045×sheetQty)/qty + 350/qty, 2500/qty)
 *     UV Crystal:MAX((W×H×0.0055×sheetQty)/qty + 350/qty, 2500/qty) + Thermal
 *
 *   Addon lam per unit = same formula but at base qty=500 (fixed rate)
 *
 *   Quotation price = (AG2 + lam + addon) × (1 + markup)
 *     markup: Retail=16%, Corporate=28%, Special=12%
 */

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Printing table: LOOKUP(sheetQty, AA:AB, AG_col) for machine 2029
// machine 1926 uses AC col (lower rates), 2840 uses AH col (empty → 0)
export const PRINTING_TABLE = [
  { from:1,     p1926:300,  p2029:750,  p2840:0 },
  { from:1081,  p1926:425,  p2029:750,  p2840:0 },
  { from:2081,  p1926:550,  p2029:750,  p2840:0 },
  { from:3081,  p1926:675,  p2029:925,  p2840:0 },
  { from:4081,  p1926:800,  p2029:875,  p2840:0 },
  { from:5081,  p1926:925,  p2029:1050, p2840:0 },
  { from:6081,  p1926:1050, p2029:1225, p2840:0 },
  { from:7081,  p1926:1175, p2029:1400, p2840:0 },
  { from:8081,  p1926:1300, p2029:1575, p2840:0 },
  { from:9081,  p1926:1425, p2029:1750, p2840:0 },
  { from:10081, p1926:1550, p2029:1925, p2840:0 },
  { from:11081, p1926:1675, p2029:2100, p2840:0 },
  { from:12081, p1926:1800, p2029:2275, p2840:0 },
  { from:13081, p1926:1925, p2029:2450, p2840:0 },
  { from:14081, p1926:2050, p2029:2625, p2840:0 },
  { from:15081, p1926:2175, p2029:2800, p2840:0 },
  { from:16081, p1926:2300, p2029:2975, p2840:0 },
  { from:17081, p1926:2425, p2029:3150, p2840:0 },
  { from:18081, p1926:2550, p2029:3325, p2840:0 },
  { from:19081, p1926:2675, p2029:3500, p2840:0 },
  { from:20081, p1926:2800, p2029:3675, p2840:0 },
  { from:25081, p1926:3300, p2029:4375, p2840:0 },
  { from:30081, p1926:3800, p2029:5075, p2840:0 },
]

// Plate price per colour per machine (Price!Y15, Z15, and 28*40)
// AH5 = platePrice × colourFactor — added to X2
export const PLATE_PRICE = { 1926: 250, 2029: 275, 2840: 650 }

// Die designing: LOOKUP(sheetQty, AE col) — Dangler Making rate per sheet
export const DIE_DESIGNING_TABLE = [
  { from: 1,    rate: 0.25 },
  { from: 5081, rate: 0.20 },
]

// Material rates (CC5) — brand determines rate, not GSM
export const MATERIAL_RATES = {
  'SBS':        { 'ITC': 85, 'Century': 80, 'Normal': 82, 'Custom': 82 },
  'WhiteBack':  { 'Khanna': 78, 'Sinar Mas': 55, 'Normal': 52, 'Custom': 52 },
  'GreyBack':   { 'Khanna': 70, 'Sinar Mas': 50, 'Normal': 47, 'Custom': 47 },
  'Art Card':   { 'Normal': 115, 'Custom': 115 },
  'Maplitho':   { 'Normal': 78, 'Custom': 78 },
  'Duplex':     { 'Custom': 75 },
  'Other Type': { 'Custom': 75 },
  'Custom Paper':{ 'Custom': 75 },
}

// Lamination rates (per sq cm per sheet) — from Price sheet
export const LAM_RATES = {
  'Plain':                   0,
  'Lamination Thermal':      0.008,    // T2
  'Lamination Normal Gloss': 0.0033,   // S2
  'Lamination Normal Matt':  0.0044,   // S3
  'Varnish':                 0.0014,   // V2
  'UV Flat':                 0.0025,   // W2
  'UV Hybrid':               0.0045,   // U2
  'UV Crystal':              0.0055,   // Y7
  'Spot UV':                 1,
}

export const COLOUR_FACTORS = {
  'Without Print':      0,
  'Single Colour':      1,
  'Double Colour':      2,
  'Four Colour':        4,
  'Four + One Colour':  6.75,
  'Four + Two Colour':  7.75,
  'Four + Four Colour': 9.75,
}

export const MARKUP_TYPES = {
  'Retail':    0.16,
  'Corporate': 0.28,
  'Special':   0.12,
  'None':      0,
}

// Addon options — lamination coatings + carry bag + gumming
export const ADDON_OPTIONS = {
  // Lamination coatings (same formula as main lam)
  'Plain':                   { type: 'lam',      rate: 0 },
  'Lamination Thermal':      { type: 'lam',      rate: 0.008 },
  'Lamination Normal Gloss': { type: 'lam',      rate: 0.0033 },
  'Lamination Normal Matt':  { type: 'lam',      rate: 0.0044 },
  'Varnish':                 { type: 'lam',      rate: 0.0014 },
  'UV Flat':                 { type: 'lam',      rate: 0.0025 },
  'UV Hybrid':               { type: 'lam',      rate: 0.0045 },
  'UV Crystal':              { type: 'lam',      rate: 0.0055 },
  'Spot UV':                 { type: 'lam',      rate: 1 },
  // Carry bag pasting — fixed ₹/unit from Price!U12 / V12
  'Carry Bag Single Pasting':{ type: 'carry',    rate: 5 },
  'Carry Bag Double Pasting':{ type: 'carry',    rate: 6 },
  // Gumming — per sq cm per sheet
  'Gumming Full':            { type: 'gumming',  rate: 0.0125 },
  'Gumming Top Bottom':      { type: 'gumming',  rate: 0.017 },
}

export const MATERIALS   = Object.keys(MATERIAL_RATES)
export const LAMINATIONS = Object.keys(LAM_RATES)
export const ADDONS      = Object.keys(ADDON_OPTIONS)

const ru = x => Math.ceil(x)

function lookupPrinting(sheetQty, machine, printingTable) {
  // Use live rates table if provided, fall back to hardcoded
  const table = (printingTable && printingTable.length) ? printingTable : PRINTING_TABLE
  let printVal = 0
  let dieVal   = 0
  const key = machine === 2029 ? 'p2029' : machine === 2840 ? 'p2840' : 'p1926'
  for (const row of table) {
    if (sheetQty >= row.from) { printVal = row[key] ?? 0; dieVal = row.die ?? 0 }
    else break
  }
  return { printVal, dieVal }
}

function getCC5(material, brand, customRate) {
  if (['Duplex', 'Other Type', 'Custom Paper'].includes(material)) return customRate ?? 75
  return MATERIAL_RATES[material]?.[brand] ?? 82
}

function calcPaper(W, H, sheetQty, gsm, cc5) {
  return ru(((W * H) / 1550) * (gsm / 1000) * (cc5 + 2) * sheetQty + (sheetQty / 144) * 15)
}

function calcLam(W, H, sheetQty, qty, lamType, lamRates) {
  const rateMap = lamRates || LAM_RATES
  const rate = rateMap[lamType] ?? 0
  if (!lamType || lamType === 'Plain' || rate === 0) return 0

  const uvFlat   = rateMap['UV Flat']    ?? 0.0025
  const uvHybrid = rateMap['UV Hybrid']  ?? 0.0045
  const uvCryst  = rateMap['UV Crystal'] ?? 0.0055
  const thermal  = rateMap['Lamination Thermal'] ?? 0.008

  if (lamType === 'UV Flat') {
    return Math.max((W * H * uvFlat * sheetQty) / qty + 350 / qty, 500 / qty)
  }
  if (lamType === 'UV Hybrid') {
    return Math.max((W * H * uvHybrid * sheetQty) / qty + 350 / qty, 2500 / qty)
  }
  if (lamType === 'UV Crystal') {
    const base = Math.max((W * H * uvCryst * sheetQty) / qty + 350 / qty, 2500 / qty)
    const th   = Math.max((W * H * thermal * sheetQty) / qty, 300 / qty)
    return base + th
  }
  return Math.max((W * H * rate * sheetQty) / qty, 300 / qty)
}

// ─── MAIN CALCULATOR ──────────────────────────────────────────────────────────

export function calculatePrice({
  product, qty, gsm, material, brand, customRate,
  colours, sides, lamination, addon, dieCutting, markupType, rates,
}) {
  const ups     = Math.max(parseFloat(product.ups)    || 1, 0.5)
  const machine = parseInt(product.machine) || 2029
  const W       = parseFloat(product.sheet_w)         || 0
  const H       = parseFloat(product.sheet_h)         || 0
  const design  = parseFloat(product.designing)       || 100
  const pasting = parseFloat(product.pasting)         || 0
  const leafing = parseFloat(product.leafing)         || 0
  const window_ = parseFloat(product.window)          || 0
  const dblChg  = parseFloat(product.double_charges)  || 1

  // Use live lam rates from rates.json if available
  const lamRates = rates ? {
    'Plain':                   0,
    'Lamination Thermal':      rates.lam_thermal      ?? LAM_RATES['Lamination Thermal'],
    'Lamination Normal Gloss': rates.lam_gloss        ?? LAM_RATES['Lamination Normal Gloss'],
    'Lamination Normal Matt':  rates.lam_matt         ?? LAM_RATES['Lamination Normal Matt'],
    'Varnish':                 rates.varnish          ?? LAM_RATES['Varnish'],
    'UV Flat':                 rates.uv_flat          ?? LAM_RATES['UV Flat'],
    'UV Hybrid':               rates.uv_hybrid        ?? LAM_RATES['UV Hybrid'],
    'UV Crystal':              rates.uv_crystal       ?? LAM_RATES['UV Crystal'],
    'Spot UV':                 LAM_RATES['Spot UV'],
  } : LAM_RATES

  const cc5 = getCC5(material, brand, customRate)

  // sheetQty = ROUNDUP(qty/ups) + 80
  const sheetQty = Math.ceil(qty / ups) + 80

  // X2 = LOOKUP(sheetQty, printingCol) × colourFactor + platePrice × colourFactor
  // platePrice per colour: 1926=₹250, 2029=₹275, 2840=₹650 (Price!Y15, Z15)
  const { printVal: rawPrint, dieVal: dieOneTime } = lookupPrinting(sheetQty, machine, rates?.printing_table)
  const cf        = COLOUR_FACTORS[colours] ?? 4
  const plateCost = (machine === 2029 ? (rates?.plate_2029 ?? PLATE_PRICE[2029])
                  : machine === 2840  ? (rates?.plate_2840 ?? PLATE_PRICE[2840])
                  :                     (rates?.plate_1926 ?? PLATE_PRICE[1926])) * cf
  const X2 = ru(rawPrint * cf) + plateCost

  // Z2 = LOOKUP(sheetQty, Price!AE) = Dangler Making rate per sheet (0.25 or 0.20)
  // Main!Z2 stores just the RATE, not rate×sheetQty. It feeds into AE2 as a tiny ₹0.25 value.
  // The one-time die tooling cost (Price!AD = ₹1800) is shown separately in the quotation.
  const dieRatePerSheet = sheetQty <= 5080 ? 0.25 : 0.20
  const Z2 = dieCutting ? dieRatePerSheet : 0

  // AE2 = ROUNDUP(V2 + Z2 + AA2 + AB2 + AC2)
  //      = ROUNDUP(designing + Z2_rate + leafing + window + pasting)
  const AE2 = ru(design + Z2 + leafing + window_ + pasting)

  // AD2 = ROUNDUP((qty×window×1.05) + MAX(sheetQty×ups×pasting, 200) + 1)
  const AD2 = ru((qty * window_ * 1.05) + Math.max(sheetQty * ups * pasting, 200) + 1)

  // P2: Paper cost
  const P2 = calcPaper(W, H, sheetQty, gsm, cc5)

  // AG2: base per unit = (P2 + AE2 + X2 + AD2) / qty
  const AG2 = (P2 + AE2 + X2 + AD2) / qty

  // Lamination per unit — sides factor (1 or 2) multiplies lamination, not printing
  const sidesFactor = sides === 'Two' ? 2 : 1
  const lamPerUnit  = calcLam(W, H, sheetQty, qty, lamination, lamRates) * sidesFactor

  // Addon per unit — TWO separate paths matching the sheet:
  // PATH 1 (B27): Coating addon = HLOOKUP(B27, Product!AG1:AN2) = same lam formula at CURRENT qty
  // PATH 2 (C26): Gumming/carry bag = (MAX(rate*qty, 250)/qty) * Z17_flag
  const addonDef = ADDON_OPTIONS[addon]
  let addonPerUnit = 0
  if (addonDef && addon !== 'Plain') {
    if (addonDef.type === 'carry') {
      // Carry bag: MAX(qty × rate, 300) / qty  — from Main!BS2/BT2
      const carryRate = addon === 'Carry Bag Single Pasting'
        ? (rates?.carry_single ?? 5)
        : (rates?.carry_double ?? 6)
      addonPerUnit = Math.max(qty * carryRate, 300) / qty
    } else if (addonDef.type === 'gumming') {
      // Gumming Full: MAX((W×H×rate×sheetQty)/qty, 500/qty)
      const gRate = addon === 'Gumming Full'
        ? (rates?.gumming_full ?? 0.0125)
        : (rates?.gumming_tb ?? 0.017)
      addonPerUnit = Math.max((W * H * gRate * sheetQty) / qty, 500 / qty)
    } else {
      // Coating addon (Lam Thermal, Gloss, Matt, Varnish, UV types)
      // Uses SAME formula as main lam at CURRENT qty/sheetQty — NOT fixed qty=500
      addonPerUnit = calcLam(W, H, sheetQty, qty, addon, lamRates)
    }
  }

  // Subtotal per unit = (base + lam + addon) × double_charges
  const subtotalPerUnit = (AG2 + lamPerUnit + addonPerUnit) * dblChg

  // Markup
  const markup       = MARKUP_TYPES[markupType] ?? MARKUP_TYPES['Retail']
  const finalPerUnit = subtotalPerUnit * (1 + markup)
  const finalTotal   = ru(finalPerUnit * qty)

  return {
    qty, sheetQty, ups, machine, sheetW: W, sheetH: H, gsm, cc5,
    material, brand, lamination, addon, dieCutting, colours, sides, markupType,
    P2, X2, Z2, AE2, AD2, AG2,
    printingRate: rawPrint,
    plateCost,
    dieRatePerSheet,
    dieOneTime,   // Price!AD — the ₹1800 separate tooling charge
    lamPerUnit, addonPerUnit, subtotalPerUnit, markup, finalPerUnit, finalTotal,
  }
}
