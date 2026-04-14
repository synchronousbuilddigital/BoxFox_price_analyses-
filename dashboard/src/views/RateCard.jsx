import { MATERIAL_RATES, LAM_RATES, PRINTING_TABLE, DIE_DESIGNING_TABLE, PLATE_PRICE } from '../engine/pricing'

export default function RateCard({ data }) {
  const { rates } = data
  const pt = rates?.printing_table || PRINTING_TABLE

  return (
    <div className="card">
      <div className="section-title">Rate Card</div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>

        {/* Material rates */}
        <div>
          <div style={{fontWeight:600,marginBottom:8,fontSize:'.85rem'}}>Material Rates (₹/1000 sheets)</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
            <thead><tr>
              <th style={{background:'#f1f5f9',padding:'6px 10px',textAlign:'left'}}>Material</th>
              <th style={{background:'#f1f5f9',padding:'6px 10px',textAlign:'left'}}>Brand</th>
              <th style={{background:'#f1f5f9',padding:'6px 10px',textAlign:'right'}}>Rate</th>
            </tr></thead>
            <tbody>
              {Object.entries(MATERIAL_RATES).flatMap(([mat, brands]) =>
                Object.entries(brands).map(([brand, rate]) => (
                  <tr key={mat+brand} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{padding:'5px 10px'}}>{mat}</td>
                    <td style={{padding:'5px 10px',color:'#64748b'}}>{brand}</td>
                    <td style={{padding:'5px 10px',textAlign:'right',fontWeight:600}}>₹{rate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Lamination rates */}
        <div>
          <div style={{fontWeight:600,marginBottom:8,fontSize:'.85rem'}}>Lamination Rates (₹/sq cm/sheet)</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
            <thead><tr>
              <th style={{background:'#f1f5f9',padding:'6px 10px',textAlign:'left'}}>Type</th>
              <th style={{background:'#f1f5f9',padding:'6px 10px',textAlign:'right'}}>Rate</th>
              <th style={{background:'#f1f5f9',padding:'6px 10px',textAlign:'right'}}>Min</th>
            </tr></thead>
            <tbody>
              {Object.entries(LAM_RATES).filter(([,r]) => r > 0).map(([t, r]) => (
                <tr key={t} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'5px 10px'}}>{t}</td>
                  <td style={{padding:'5px 10px',textAlign:'right',fontWeight:600}}>₹{r}</td>
                  <td style={{padding:'5px 10px',textAlign:'right',color:'#94a3b8'}}>₹300</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{marginTop:16,fontWeight:600,marginBottom:8,fontSize:'.85rem'}}>Fixed Charges</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
            <tbody>
              {[
                ['Plate (Machine 1926)', '₹250/colour'],
                ['Plate (Machine 1926)', `₹${PLATE_PRICE[1926]}/colour`],
                ['Plate (Machine 2029)', `₹${PLATE_PRICE[2029]}/colour`],
                ['Plate (Machine 2840)', `₹${PLATE_PRICE[2840]}/colour`],
                ['Die ≤5080 sheets',    `₹${DIE_DESIGNING_TABLE[0].rate}/sheet`],
                ['Die >5080 sheets',    `₹${DIE_DESIGNING_TABLE[1].rate}/sheet`],
              ].map(([k,v]) => (
                <tr key={k} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'5px 10px'}}>{k}</td>
                  <td style={{padding:'5px 10px',textAlign:'right',fontWeight:600}}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printing table */}
      <div style={{marginTop:20}}>
        <div style={{fontWeight:600,marginBottom:8,fontSize:'.85rem'}}>
          Printing Rate Table (₹ per colour, by sheet qty)
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{borderCollapse:'collapse',fontSize:'.82rem',minWidth:400}}>
            <thead><tr>
              {['Sheets From','Sheets To','Rate/Colour'].map(h => (
                <th key={h} style={{background:'#1e1b4b',color:'white',padding:'7px 14px',textAlign:'right'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {PRINTING_TABLE.map((r,i) => (
                <tr key={i} style={{background:i%2===0?'#f8fafc':'white',borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'6px 14px',textAlign:'right'}}>{r.from.toLocaleString('en-IN')}</td>
                  <td style={{padding:'6px 14px',textAlign:'right'}}>{r.to.toLocaleString('en-IN')}</td>
                  <td style={{padding:'6px 14px',textAlign:'right',fontWeight:600}}>₹{r.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
