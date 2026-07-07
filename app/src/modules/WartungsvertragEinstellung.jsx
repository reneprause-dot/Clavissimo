/**
 * Clavissimo – Wartungsvertrag-Einstellung
 * Admin-Eingabefeld für das vertragliche Wartungsende.
 * Rein informativ (siehe wartungsvertrag.js) — das Setzen/Ändern
 * dieses Datums hat keinerlei Auswirkung auf die Funktionsfähigkeit
 * der Software, es steuert nur die Hinweisanzeige im Header-Menü.
 *
 * Einbindung z.B. in Einstellungen.jsx:
 *   import WartungsvertragEinstellung from './WartungsvertragEinstellung'
 *   ...
 *   {hasRole('admin') && <WartungsvertragEinstellung />}
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ladeWartungsvertragBis, setzeWartungsvertragBis, wartungsStatus, formatDatumDe } from '../lib/wartungsvertrag'

export default function WartungsvertragEinstellung() {
  const { hasRole } = useAuth()
  const [datum, setDatum] = useState('')
  const [gespeichert, setGespeichert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000) }

  useEffect(() => {
    ladeWartungsvertragBis().then(d => {
      setGespeichert(d)
      setDatum(d || '')
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const res = await setzeWartungsvertragBis(datum)
    setSaving(false)
    if (res.ok) {
      setGespeichert(datum)
      showMsg(true, 'Wartungsvertrag-Enddatum gespeichert.')
    } else {
      showMsg(false, `Fehler: ${res.error}`)
    }
  }

  if (!hasRole('admin')) return null

  const status = wartungsStatus(gespeichert)

  return (
    <div style={card}>
      <h3 style={{ margin:'0 0 0.3rem', fontSize:'0.95rem', fontWeight:700, color:'var(--text-primary,#17241A)' }}>
        📄 Wartungsvertrag
      </h3>
      <p style={{ margin:'0 0 1rem', fontSize:'0.78rem', color:'var(--text-muted,#748575)', lineHeight:1.5 }}>
        Rein informativ: Clavissimo hat kein Lizenzsystem — die Software funktioniert unabhängig
        von diesem Datum uneingeschränkt weiter. Das Feld dient nur der eigenen Übersicht, wann
        Updates, Support und rechtliche Anpassungen (MedCanG, BtMG, GDP) vertraglich enden.
      </p>

      {msg && (
        <div style={{
          padding:'0.55rem 0.8rem', borderRadius:8, fontSize:'0.78rem', marginBottom:'0.85rem',
          background: msg.ok ? 'var(--success,#16A34A)18' : 'var(--danger,#B3261E)18',
          color: msg.ok ? 'var(--success,#16A34A)' : 'var(--danger,#B3261E)',
        }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ color:'var(--text-muted,#748575)', fontSize:'0.8rem' }}>Lade...</div>
      ) : (
        <>
          {status && (
            <div style={{
              display:'inline-flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.9rem',
              padding:'0.35rem 0.7rem', borderRadius:20, fontSize:'0.72rem', fontWeight:600,
              background: status.status==='abgelaufen' ? 'var(--danger,#B3261E)18'
                        : status.status==='laeuft_bald_ab' ? 'var(--warning,#B4650F)18'
                        : 'var(--success,#16A34A)18',
              color: status.status==='abgelaufen' ? 'var(--danger,#B3261E)'
                   : status.status==='laeuft_bald_ab' ? 'var(--warning,#B4650F)'
                   : 'var(--success,#16A34A)',
            }}>
              {status.status==='abgelaufen' ? '⚠️' : status.status==='laeuft_bald_ab' ? '⏰' : '✓'}
              {status.label} · gültig bis {formatDatumDe(gespeichert)}
            </div>
          )}

          <div style={{ display:'flex', gap:'0.6rem', alignItems:'flex-end', flexWrap:'wrap' }}>
            <div>
              <label style={lbl}>Wartungsvertrag gültig bis</label>
              <input
                type="date"
                value={datum}
                onChange={e => setDatum(e.target.value)}
                style={inp}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !datum}
              style={{ ...btnPrimary, opacity: saving || !datum ? 0.6 : 1 }}
            >
              {saving ? 'Speichern...' : '✓ Speichern'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const card = {
  background: 'var(--card-bg,#fff)',
  border: '1px solid var(--border,#DCE6DC)',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  maxWidth: 480,
}

const lbl = {
  display: 'block', color: 'var(--text-muted,#748575)', fontSize: '0.7rem',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem',
}

const inp = {
  background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)',
  borderRadius: 8, padding: '0.5rem 0.7rem', color: 'var(--text-primary,#17241A)',
  fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none',
}

const btnPrimary = {
  background: 'var(--accent,#16A34A)', color: '#fff', border: 'none', borderRadius: 8,
  padding: '0.55rem 1.1rem', cursor: 'pointer', fontFamily: 'inherit',
  fontSize: '0.82rem', fontWeight: 600,
}
