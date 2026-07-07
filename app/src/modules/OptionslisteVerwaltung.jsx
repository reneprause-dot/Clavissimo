/**
 * Clavissimo – Optionsliste-Verwaltung (eine Karte pro Stammdaten-Liste)
 * Wird mehrfach in Einstellungen.jsx instanziiert, je eine pro Tabelle.
 */
import { useEffect, useState } from 'react'
import { ladeOptionen, fuegeOptionHinzu, setzeOptionAktiv } from '../lib/optionsListen'

export default function OptionslisteVerwaltung({ tabelle, label, icon = '📋' }) {
  const [werte, setWerte] = useState([])
  const [loading, setLoading] = useState(true)
  const [neu, setNeu] = useState('')
  const [saving, setSaving] = useState(false)
  const [fehler, setFehler] = useState(null)

  const load = async () => {
    setLoading(true)
    setWerte(await ladeOptionen(tabelle))
    setLoading(false)
  }

  useEffect(() => { load() }, [tabelle])

  const handleAdd = async () => {
    setFehler(null)
    setSaving(true)
    const res = await fuegeOptionHinzu(tabelle, neu)
    setSaving(false)
    if (!res.ok) { setFehler(res.error); return }
    setNeu('')
    load()
  }

  const handleToggle = async (o) => {
    await setzeOptionAktiv(tabelle, o.id, !o.aktiv)
    load()
  }

  return (
    <div style={card}>
      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-primary,#17241A)' }}>
        {icon} {label}
      </h4>

      {loading ? (
        <div style={{ color: 'var(--text-muted,#748575)', fontSize: '0.78rem' }}>Lade…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.9rem', maxHeight: 220, overflowY: 'auto' }}>
          {werte.length === 0 && <div style={{ color: 'var(--text-muted,#748575)', fontSize: '0.78rem' }}>Noch keine Werte.</div>}
          {werte.map(o => (
            <label key={o.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.4rem 0.6rem', borderRadius: 7, cursor: 'pointer',
              background: o.aktiv ? 'transparent' : 'var(--text-muted,#748575)11',
              fontSize: '0.8rem', color: o.aktiv ? 'var(--text-primary,#17241A)' : 'var(--text-muted,#748575)',
            }}>
              <span>{o.bezeichnung}</span>
              <input type="checkbox" checked={o.aktiv} onChange={() => handleToggle(o)} title="aktiv/inaktiv" />
            </label>
          ))}
        </div>
      )}

      {fehler && <div style={{ color: 'var(--danger,#B3261E)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{fehler}</div>}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={neu} onChange={e => setNeu(e.target.value)}
          placeholder="Neuer Wert…" style={inp}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} disabled={saving || !neu.trim()} style={{ ...btn, opacity: saving || !neu.trim() ? 0.6 : 1 }}>
          + Hinzufügen
        </button>
      </div>
    </div>
  )
}

const card = {
  background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)',
  borderRadius: 12, padding: '1.1rem 1.25rem',
}
const inp = {
  flex: 1, background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)',
  borderRadius: 8, padding: '0.45rem 0.65rem', color: 'var(--text-primary,#17241A)',
  fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none',
}
const btn = {
  background: 'var(--accent,#16A34A)', color: '#fff', border: 'none', borderRadius: 8,
  padding: '0.45rem 0.8rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600,
  whiteSpace: 'nowrap',
}
