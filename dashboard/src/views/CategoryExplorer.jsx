import { useState, useMemo } from 'react'
import Select from '../components/Select'

export default function CategoryExplorer({ data }) {
  const { categories } = data
  const [cat, setCat] = useState('')
  const [sub, setSub] = useState('')

  const catList = useMemo(() => Object.keys(categories).sort(), [categories])
  const subList = useMemo(() => cat ? Object.keys(categories[cat] || {}).sort() : [], [categories, cat])

  const product = cat && sub ? categories[cat]?.[sub] : null
  const allSubs = cat ? Object.entries(categories[cat] || {}) : []

  return (
    <div className="card">
      <div className="section-title">Category Explorer</div>
      <div className="filters">
        <Select label="Category"     value={cat} options={catList} onChange={v => { setCat(v); setSub('') }} />
        <Select label="Sub Category" value={sub} options={subList} onChange={setSub} disabled={!cat} />
      </div>

      {/* Show all sub-categories for selected category */}
      {cat && !sub && (
        <div>
          <div style={{fontSize:'.8rem',color:'#64748b',marginBottom:12}}>
            {allSubs.length} sub-categories in <strong>{cat}</strong>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10}}>
            {allSubs.map(([s, p]) => {
              // support both old flat and new per-spec structure
              const firstSpec = p.specs ? Object.values(p.specs)[0] : p
              const specCount = p.specs ? Object.keys(p.specs).filter(k => k !== '__default__').length : (p.specifications?.length ?? 0)
              return (
              <div key={s} className="info-item" style={{cursor:'pointer',border:'1.5px solid #e2e8f0',borderRadius:8,padding:12}}
                onClick={() => setSub(s)}>
                <div style={{fontWeight:600,marginBottom:6}}>{s}</div>
                <div style={{fontSize:'.78rem',color:'#64748b',display:'flex',gap:12,flexWrap:'wrap'}}>
                  <span>Ups: {firstSpec?.ups ?? '—'}</span>
                  <span>Machine: {firstSpec?.machine ?? '—'}</span>
                  <span>W×H: {firstSpec?.sheet_w ?? '—'}×{firstSpec?.sheet_h ?? '—'}</span>
                  <span>Type: {firstSpec?.sub_type ?? '—'}</span>
                </div>
                {specCount > 0 && (
                  <div style={{fontSize:'.72rem',color:'#94a3b8',marginTop:4}}>
                    {specCount} spec{specCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Show full detail for selected sub-category */}
      {product && (() => {
        const isNewStructure = !!product.specs
        const specs = isNewStructure ? Object.entries(product.specs).filter(([k]) => k !== '__default__') : null
        const firstData = isNewStructure ? Object.values(product.specs)[0] : product
        return (
        <div>
          <div style={{fontWeight:600,marginBottom:12}}>{cat} › {sub}</div>

          {isNewStructure ? (
            // New per-spec structure — show each spec with its own data
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {specs.map(([specName, d]) => (
                <div key={specName} style={{border:'1.5px solid #e2e8f0',borderRadius:8,padding:12}}>
                  <div style={{fontWeight:600,marginBottom:6,fontSize:'.85rem'}}>{specName}</div>
                  <div style={{fontSize:'.78rem',color:'#64748b',display:'flex',gap:16,flexWrap:'wrap'}}>
                    <span>Ups: {d.ups ?? '—'}</span>
                    <span>Machine: {d.machine ?? '—'}</span>
                    <span>W×H: {d.sheet_w ?? '—'}×{d.sheet_h ?? '—'} in</span>
                    <span>Designing: ₹{d.designing ?? 100}</span>
                    {d.pasting ? <span>Pasting: ₹{d.pasting}/unit</span> : null}
                    {d.window  ? <span>Window: ₹{d.window}</span> : null}
                    {d.leafing ? <span>Leafing: ₹{d.leafing}</span> : null}
                    <span>Type: {d.sub_type ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Old flat structure
            <div className="info-grid">
              {[
                ['No. of Ups',     firstData.ups],
                ['Machine',        firstData.machine],
                ['Sheet Width',    firstData.sheet_w ? firstData.sheet_w + ' in' : '—'],
                ['Sheet Height',   firstData.sheet_h ? firstData.sheet_h + ' in' : '—'],
                ['Type',           firstData.type],
                ['Sub Type',       firstData.sub_type],
                ['Designing',      '₹' + (firstData.designing || 100)],
                ['Pasting',        firstData.pasting ? '₹' + firstData.pasting + '/unit' : '—'],
              ].map(([k, v]) => (
                <div className="info-item" key={k}><div className="k">{k}</div><div className="v">{v ?? '—'}</div></div>
              ))}
            </div>
          )}
        </div>
        )
      })()}
    </div>
  )
}
