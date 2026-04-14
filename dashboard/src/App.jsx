import { useState } from 'react'
import { useData } from './hooks/useData'
import PricingCalculator from './views/PricingCalculator'
import CategoryExplorer  from './views/CategoryExplorer'
import RateCard          from './views/RateCard'
import './index.css'

const TABS = [
  { key: 'calculator', label: 'Pricing Calculator' },
  { key: 'explorer',   label: 'Category Explorer' },
  { key: 'rates',      label: 'Rate Card' },
]

export default function App() {
  const { data, loading, error } = useData()
  const [tab, setTab] = useState('calculator')

  if (loading) return <div className="loading">Loading pricing data...</div>
  if (error)   return <div className="app"><div className="error">Error: {error}</div></div>

  return (
    <div className="app">
      <div className="header">
        <h1>Pricing Dashboard</h1>
        <p>76 categories · 467 sub-categories · 1999 products · Live pricing engine</p>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calculator' && <PricingCalculator data={data} />}
      {tab === 'explorer'   && <CategoryExplorer  data={data} />}
      {tab === 'rates'      && <RateCard          data={data} />}
    </div>
  )
}
