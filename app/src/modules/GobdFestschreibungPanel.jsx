import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ladeGobdPerioden, pruefePeriode, festschreibePeriode } from '../lib/gobdFestschreibung'

function aktuellerMonat() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function GobdFestschreibungPanel() {
  const { hasRole, erpUser } = useAuth()
  const [periode, setPeriode] = useState(aktuellerMonat())
  const [vorschau, setVorschau] = useState(null)
  const [perioden, setPerioden] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 6000) }

  const load = async () => setPerioden(await ladeGobdPerioden())
  useEffect(() => { load() }, [])
  useEffect(() => { pruefePeriode(periode).then(setVorschau) }, [periode])

  const handleFestschreiben = async () => {
    if (!window.confirm(`Periode ${periode} wirklich festschreiben? Das kann NICHT rückgängig gemacht werden.`)) return
    setSaving(true)
    const res = await festschreibePeriode(periode, erpUser?.id)
    setSaving(false)
    if (!res.ok) { showMsg(false, res.error); return }
    showMsg(true, `${res.anzahl} Buchungen festgeschrieben. Hash: ${res.hash.slice(0, 16)}…`)
    load()
    pruefePeriode(periode).then(setVorschau)
  }

  if (!hasRole('manager')) return null

  const bereitsFestgeschrieben = perioden.find(p => p.periode === periode)?.festgeschrieben

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', color: 'var(--text-primary,#17241A)' }}>
        🔒 GoBD-Festschreibung
      </h3>
      <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: 'var(--text-muted,#748575)', lineHeight: 1.5 }}>
        Schreibt alle Buchungen einer Periode unveränderlich fest (Hash-Bildung + Sperre).
        Danach kann niemand — auch kein Admin — diese Buchungen mehr ändern. Nur Korrekturbuchungen sind noch möglich.
      </p>

      {msg && (
        <div style={{ padding: '0.55rem 0.8rem', borderRadius: 8, fontSize: '0.78rem', marginBottom: '0.9rem', background: msg.ok ? 'var(--success,#16A34A)18' : 'var(--danger,#B3261E)18', color: msg.ok ? 'var(--success,#16A34A)' : 'var(--danger,#B3261E)' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
        <div>
          <label style={lbl}>Periode</label>
          <input type="month" value={periode} onChange={e => setPeriode(e.target.value)} style={inp} />
        </div>
        {vorschau && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary,#3E4E40)' }}>
            {vorschau.anzahl} Buchungen gesamt, <strong>{vorschau.offen} noch offen</strong>
          </div>
        )}
      </div>

      {bereitsFestgeschrieben ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--success,#16A34A)' }}>✓ Diese Periode ist bereits festgeschrieben.</div>
      ) : (
        <button onClick={handleFestschreiben} disabled={saving || !vorschau?.offen} style={{ ...btn, opacity: saving || !vorschau?.offen ? 0.5 : 1 }}>
          {saving ? 'Schreibe fest...' : `🔒 Periode ${periode} festschreiben`}
        </button>
      )}

      {perioden.length > 0 && (
        <div style={{ marginTop: '1.1rem', paddingTop: '0.9rem', borderTop: '1px dashed var(--border,#DCE6DC)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted,#748575)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Bereits festgeschriebene Perioden</div>
          {perioden.filter(p => p.festgeschrieben).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.3rem 0', color: 'var(--text-secondary,#3E4E40)' }}>
              <span>{p.periode} · {p.anzahl_buchungen} Buchungen</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-muted,#748575)' }}>{p.hash_gesamt?.slice(0, 12)}…</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const card = { background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, padding: '1.25rem 1.5rem', maxWidth: 560 }
const lbl = { display: 'block', color: 'var(--text-muted,#748575)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }
const inp = { background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.5rem 0.7rem', color: 'var(--text-primary,#17241A)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }
const btn = { background: 'var(--danger,#B3261E)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600 }
