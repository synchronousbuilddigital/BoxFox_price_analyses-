export default function Select({ label, value, options, onChange, disabled }) {
  return (
    <div className="fg">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
        <option value="">— Select —</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}
