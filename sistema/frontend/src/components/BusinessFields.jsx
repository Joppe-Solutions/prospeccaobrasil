export default function BusinessFields({ fields, form, onChange, options = {} }) {
  return <div className="wz-grid">{fields.map(([key, label, type = 'text', required = false]) => <div className={`wz-field ${type === 'textarea' ? 'wz-full' : ''}`} key={key}>
    <label htmlFor={`business-${key}`}>{label}{required && <span className="wz-required" aria-hidden="true">*</span>}</label>
    {type === 'textarea' ? <textarea id={`business-${key}`} aria-label={label} rows={3} required={required} value={form[key] ?? ''} onChange={e => onChange(key, e.target.value)} /> : type === 'select' ? <select id={`business-${key}`} aria-label={label} required={required} value={form[key] ?? ''} onChange={e => onChange(key, e.target.value)}><option value="">Selecione</option>{(options[key] || []).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select> : <input id={`business-${key}`} aria-label={label} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} required={required} value={form[key] ?? ''} onChange={e => onChange(key, e.target.value)} />}
  </div>)}</div>;
}
