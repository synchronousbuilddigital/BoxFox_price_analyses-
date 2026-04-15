import { useState, useMemo } from 'react'
import Select from '../components/Select'
import {
  calculatePrice,
  MATERIALS, MATERIAL_RATES, LAMINATIONS, LAM_RATES,
  COLOUR_FACTORS, MARKUP_TYPES, ADDONS, ADDON_OPTIONS
} from '../engine/pricing'

const QTY_PRESETS = [10, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000]
const GSM_OPTIONS = ['65','80','90','100','110','130','150','170','220','230','250','280','300','330','350']

const fmt  = n => (n == null || isNaN(n)) ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const fmtU = n => (n == null || isNaN(n)) ? '—' : '₹' + Number(n).toFixed(4)
const fmtN = n => (n == null || isNaN(n)) ? '—' : Number(n).toFixed(4)

export default function PricingCalculator({ data }) {
  const { categories, rates } = data

  const [cat,  setCat]  = useState('')
  const [sub,  setSub]  = useState('')
  const [spec, setSpec] = useState('')
  const [qty,  setQty]  = useState(1000)

  const [mat,        setMat]        = useState('SBS')
  const [brand,      setBrand]      = useState('ITC')
  const [gsm,        setGsm]        = useState('280')
  const [customRate, setCustomRate] = useState(75)

  const [colours,  setColours]  = useState('Four Colour')
  const [sides,    setSides]    = useState('One')
  const [lam,      setLam]      = useState('Lamination Thermal')
  const [addon,    setAddon]    = useState('Plain')
  const [die,      setDie]      = useState(true)
  const [markup,   setMarkup]   = useState('Retail')

  const catList  = useMemo(() => Object.keys(categories).sort(), [categories])
  const subList  = useMemo(() => cat ? Object.keys(categories[cat] || {}).sort() : [], [categories, cat])
  const subData  = useMemo(() => (cat && sub) ? categories[cat]?.[sub] : null, [categories, cat, sub])

  // Support both old flat structure and new per-spec structure
  const specList = useMemo(() => {
    if (!subData) return []
    if (subData.specs) return Object.keys(subData.specs).filter(k => k !== '__default__')
    return subData.specifications?.filter(Boolean) || []
  }, [subData])

  // product = spec-level data if available, else sub-level flat data
  const product = useMemo(() => {
    if (!subData) return null
    if (subData.specs) {
      const key = spec && subData.specs[spec] ? spec : Object.keys(subData.specs)[0]
      return subData.specs[key] ?? null
    }
    return subData
  }, [subData, spec])

  const brandList = useMemo(() => Object.keys(MATERIAL_RATES[mat] || { Custom: 75 }), [mat])
  const isCustom  = ['Duplex', 'Other Type', 'Custom Paper'].includes(mat)

  const handleMat = v => { setMat(v); setBrand(Object.keys(MATERIAL_RATES[v] || { Custom: 75 })[0]) }
  const handleSub = v => { setSub(v); setSpec('') }

  const result = useMemo(() => {
    if (!product || !qty || qty <= 0) return null
    try {
      return calculatePrice({
        product, qty: Number(qty), gsm: Number(gsm),
        material: mat, brand, customRate: Number(customRate),
        colours, sides, lamination: lam, addon, dieCutting: die, markupType: markup,
        rates,
      })
    } catch (e) { console.error('Pricing error:', e); return null }
  }, [product, qty, gsm, mat, brand, customRate, colours, sides, lam, addon, die, markup, rates])

  const lamRate = LAM_RATES[lam] ?? 0

  return (
    <div className="card">
      <div className="section-title">Pricing Calculator</div>

      {/* Product selection */}
      <div className="filters">
        <Select label="Category"     value={cat}  options={catList}  onChange={v => { setCat(v); setSub(''); setSpec('') }} />
        <Select label="Sub Category" value={sub}  options={subList}  onChange={handleSub} disabled={!cat} />
        <Select label="Size / Spec"  value={spec} options={specList} onChange={setSpec}   disabled={!sub || specList.length === 0} />
      </div>

      {/* Product info */}
      {product && (
        <div className="info-grid" style={{marginBottom:16}}>
          {[
            ['No. of Ups',  product.ups      ?? '—'],
            ['Machine',     product.machine  ?? '—'],
            ['Sheet W',     product.sheet_w  ? product.sheet_w + ' in' : '—'],
            ['Sheet H',     product.sheet_h  ? product.sheet_h + ' in' : '—'],
            ['Pasting Rate',product.pasting  ? '₹' + product.pasting  : '—'],
            ['Window Rate', product.window   ? '₹' + product.window   : '—'],
            ['Type',        product.type     ?? '—'],
            ['Sub Type',    product.sub_type ?? '—'],
            ['Selected Size', spec || '(all sizes)'],
          ].map(([k, v]) => (
            <div className="info-item" key={k}>
              <div className="k">{k}</div>
              <div className="v">{String(v)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="divider" />

      {/* Options */}
      <div className="filters">
        <div className="fg">
          <label>Quantity</label>
          <input type="number" value={qty} min={1} onChange={e => setQty(e.target.value)} />
          <div className="qty-presets">
            {QTY_PRESETS.map(q => (
              <button key={q} className="qty-preset" onClick={() => setQty(q)}>
                {q.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        <Select label="Material" value={mat} options={MATERIALS} onChange={handleMat} />

        {!isCustom && <Select label="Brand" value={brand} options={brandList} onChange={setBrand} />}

        {isCustom && (
          <div className="fg">
            <label>Custom Rate (₹/1000 sheets)</label>
            <input type="number" value={customRate} min={0} onChange={e => setCustomRate(e.target.value)} />
          </div>
        )}

        <Select label="GSM" value={gsm} options={GSM_OPTIONS} onChange={setGsm} />
        <Select label="Print Colours" value={colours} options={Object.keys(COLOUR_FACTORS)} onChange={setColours} />

        <div className="fg">
          <label>Printing Sides</label>
          <select value={sides} onChange={e => setSides(e.target.value)}>
            <option value="One">One Side</option>
            <option value="Two">Two Side</option>
          </select>
        </div>

        <Select label="Lamination" value={lam} options={LAMINATIONS} onChange={setLam} />
        <Select label="Add-On" value={addon} options={ADDONS} onChange={setAddon} />

        <div className="fg">
          <label>Die Cutting</label>
          <select value={die ? 'yes' : 'no'} onChange={e => setDie(e.target.value === 'yes')}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="fg">
          <label>Sale Type (Markup)</label>
          <select value={markup} onChange={e => setMarkup(e.target.value)}>
            {Object.keys(MARKUP_TYPES).map(k => {
              const pct = k === 'Retail'    ? (rates?.markup_retail    ?? MARKUP_TYPES['Retail'])
                        : k === 'Corporate' ? (rates?.markup_corporate ?? MARKUP_TYPES['Corporate'])
                        : k === 'Special'   ? (rates?.markup_special   ?? MARKUP_TYPES['Special'])
                        : 0
              return <option key={k} value={k}>{k} ({(pct*100).toFixed(0)}%)</option>
            })}
          </select>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="result-card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:16}}>
            <div style={{fontSize:'.82rem',color:'#64748b'}}>
              <strong>{cat}</strong> › <strong>{sub}</strong>
              {spec ? <> › <strong>{spec}</strong></> : null}
              &nbsp;|&nbsp; Qty: <strong>{Number(qty).toLocaleString('en-IN')}</strong>
              &nbsp;|&nbsp; Sheets: <strong>{result.sheetQty}</strong>
              &nbsp;|&nbsp; Ups: <strong>{result.ups}</strong>
              &nbsp;|&nbsp; Machine: <strong>{result.machine}</strong>
            </div>
          </div>

          {/* Top boxes */}
          <div className="result-grid">
            <div className="price-box highlight" style={{borderColor:'#16a34a',background:'#f0fdf4'}}>
              <div className="label">Quotation Price / Unit ({markup} +{(result.markup*100).toFixed(0)}%)</div>
              <div className="value" style={{color:'#15803d'}}>{fmtU(result.finalPerUnit)}</div>
              <div className="sub">= base × {(1+result.markup).toFixed(2)}</div>
            </div>
            <div className="price-box highlight" style={{borderColor:'#16a34a',background:'#f0fdf4'}}>
              <div className="label">Quotation Total ({Number(qty).toLocaleString('en-IN')} units)</div>
              <div className="value" style={{color:'#15803d'}}>{fmt(result.finalTotal)}</div>
              <div className="sub">{markup} pricing</div>
            </div>
            <div className="price-box">
              <div className="label">Base Price / Unit (before markup)</div>
              <div className="value">{fmtU(result.subtotalPerUnit)}</div>
              <div className="sub">AG2 + lam + addon</div>
            </div>
            <div className="price-box">
              <div className="label">Markup Amount / Unit</div>
              <div className="value">{fmtU(result.finalPerUnit - result.subtotalPerUnit)}</div>
              <div className="sub">base × {(result.markup*100).toFixed(0)}%</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="breakdown" style={{marginTop:20}}>
            <div style={{fontSize:'.75rem',fontWeight:600,color:'#94a3b8',textTransform:'uppercase',marginBottom:8,letterSpacing:'.05em'}}>
              Full Cost Breakdown
            </div>
            <table>
              <thead>
                <tr><th>Component</th><th>Formula / Notes</th><th>Job Total</th><th>Per Unit</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Printing (X2)</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>
                    LOOKUP({result.sheetQty} sheets)=₹{result.printingRate} × {COLOUR_FACTORS[colours]} colours × {sides === 'Two' ? '2 sides' : '1 side'} + plate₹{result.plateCost}
                  </td>
                  <td>{fmt(result.X2)}</td>
                  <td>{fmtN(result.X2 / qty)}</td>
                </tr>
                <tr>
                  <td><strong>Die Run Cost (Z2)</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>
                    {die ? `₹${result.dieRatePerSheet}/sheet × ${result.sheetQty} sheets (Price!AE)` : 'Skipped'}
                  </td>
                  <td>{fmt(result.Z2)}</td>
                  <td>{fmtN(result.Z2 / qty)}</td>
                </tr>
                <tr>
                  <td><strong>Fixed Charges (AE2)</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>
                    ROUNDUP(designing₹{product?.designing||100} + Z2{result.Z2} + leafing{product?.leafing||0} + pasting{product?.pasting||0})
                  </td>
                  <td>{fmt(result.AE2)}</td>
                  <td>{fmtN(result.AE2 / qty)}</td>
                </tr>
                <tr>
                  <td><strong>Other Charges (AD2)</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>
                    ROUNDUP(qty×window×1.05 + MAX(sheets×ups×pasting, 200)+1)
                  </td>
                  <td>{fmt(result.AD2)}</td>
                  <td>{fmtN(result.AD2 / qty)}</td>
                </tr>
                <tr>
                  <td><strong>Paper Cost (P2)</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>
                    (W{result.sheetW}×H{result.sheetH}/1550)×(GSM{result.gsm}/1000)×(CC5={result.cc5}+2)×{result.sheetQty}
                  </td>
                  <td>{fmt(result.P2)}</td>
                  <td>{fmtN(result.P2 / qty)}</td>
                </tr>
                <tr style={{background:'#f8fafc'}}>
                  <td><strong>Base Per Unit (AG2)</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>(P2+AE2+X2+AD2) / qty</td>
                  <td><strong>{fmt(result.AG2 * qty)}</strong></td>
                  <td><strong>{fmtN(result.AG2)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Lamination</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>
                    {lam === 'UV Flat'    ? `MAX(W×H×0.0025×${result.sheetQty}/${qty}+350/${qty}, 500/${qty})`
                    : lam === 'UV Hybrid' ? `MAX(W×H×0.0045×${result.sheetQty}/${qty}+350/${qty}, 2500/${qty})`
                    : lam === 'UV Crystal'? `MAX(W×H×0.0055×${result.sheetQty}/${qty}+350/${qty}, 2500/${qty})+Thermal`
                    : lam === 'Plain'     ? 'No lamination'
                    : `MAX(W×H×${lamRate}×${result.sheetQty}/${qty}, 300/${qty}) | ${lam}`}
                  </td>
                  <td>{fmt(result.lamPerUnit * qty)}</td>
                  <td>{fmtN(result.lamPerUnit)}</td>
                </tr>
                <tr>
                  <td><strong>Add-On</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>
                    {addon === 'Plain' ? 'None'
                    : addon === 'Carry Bag Single Pasting' ? `MAX(qty×₹${rates?.carry_single??5}, 300)/qty`
                    : addon === 'Carry Bag Double Pasting' ? `MAX(qty×₹${rates?.carry_double??6}, 300)/qty`
                    : addon === 'Gumming Full' || addon === 'Gumming Top Bottom' ? `MAX(W×H×rate×sheets/qty, 500/qty) | ${addon}`
                    : `Lam coating at qty=500 rate | ${addon}`}
                  </td>
                  <td>{fmt(result.addonPerUnit * qty)}</td>
                  <td>{fmtN(result.addonPerUnit)}</td>
                </tr>
                <tr style={{background:'#eef2ff'}}>
                  <td><strong>Subtotal (Base)</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>AG2 + lam + addon</td>
                  <td><strong>{fmt(result.subtotalPerUnit * qty)}</strong></td>
                  <td><strong>{fmtN(result.subtotalPerUnit)}</strong></td>
                </tr>
                <tr style={{background:'#fef9c3'}}>
                  <td><strong>Markup ({markup} {(result.markup*100).toFixed(0)}%)</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>subtotal × {result.markup.toFixed(2)}</td>
                  <td><strong>{fmt((result.finalPerUnit - result.subtotalPerUnit) * qty)}</strong></td>
                  <td><strong>{fmtN(result.finalPerUnit - result.subtotalPerUnit)}</strong></td>
                </tr>
                <tr style={{background:'#f0fdf4'}}>
                  <td><strong>QUOTATION PRICE</strong></td>
                  <td style={{color:'#94a3b8',fontSize:'.75rem'}}>subtotal × {(1+result.markup).toFixed(2)}</td>
                  <td><strong>{fmt(result.finalTotal)}</strong></td>
                  <td><strong>{fmtN(result.finalPerUnit)}</strong></td>
                </tr>
                {result.dieOneTime > 0 && (
                  <tr style={{background:'#fef2f2'}}>
                    <td><strong>Extra Charges — Die Tooling</strong></td>
                    <td style={{color:'#94a3b8',fontSize:'.75rem'}}>One-time charge (Price!AD) — billed separately, not in unit price</td>
                    <td><strong>{fmt(result.dieOneTime)}</strong></td>
                    <td style={{color:'#94a3b8'}}>one-time</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!product && cat && sub && (
        <div className="error">No product data found for {cat} › {sub}</div>
      )}
    </div>
  )
}
