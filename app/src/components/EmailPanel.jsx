import { useEffect, useState } from 'react'
import { erstelleRechnungsEmail, sendeEmail, isEmailKonfiguriert } from '../lib/emailService'

export default function EmailPanel({ beleg, positionen, firma, typ, empfaenger, onClose }) {
  const [an, setAn] = useState(empfaenger?.email || '')
  const [betreff, setBetreff] = useState('')
  const [html, setHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    const vorlage = erstelleRechnungsEmail({ ...beleg, typ: typ || beleg.typ }, positionen, firma)
    setBetreff(vorlage.betreff)
    setHtml(vorlage.html)
  }, [beleg, positionen, firma, typ])

  const handleSenden = async () => {
    if (!an.trim()) { setMsg({ ok: false, text: 'Empfänger-E-Mail fehlt.' }); return }
    setSaving(true)
    const res = await sendeEmail({ to: an.trim(), subject: betreff, html })
    setSaving(false)
    if (!res.ok) { setMsg({ ok: false, text: res.error || 'Versand fehlgeschlagen.' }); return }
    setMsg({ ok: true, text: 'E-Mail versendet.' })
    setTimeout(onClose, 1200)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary,#17241A)' }}>✉️ Beleg per E-Mail senden</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary,#3E4E40)' }}>×</button>
        </div>

        {!isEmailKonfiguriert() && (
          <div style={{ padding: '0.6rem 0.8rem', borderRadius: 8, fontSize: '0.78rem', marginBottom: '1rem', background: 'var(--warning,#B4650F)18', color: 'var(--warning,#B4650F)' }}>
            ⚠️ <code>VITE_PROXY_URL</code> ist nicht gesetzt — Versand wird fehlschlagen.
          </div>
        )}
        {msg && (
          <div style={{ padding: '0.6rem 0.8rem', borderRadius: 8, fontSize: '0.78rem', marginBottom: '1rem', background: msg.ok ? 'var(--success,#16A34A)18' : 'var(--danger,#B3261E)18', color: msg.ok ? 'var(--success,#16A34A)' : 'var(--danger,#B3261E)' }}>
            {msg.text}
          </div>
        )}

        <label style={lbl}>An</label>
        <input value={an} onChange={e => setAn(e.target.value)} style={inp} type="email" />

        <label style={lbl}>Betreff</label>
        <input value={betreff} onChange={e => setBetreff(e.target.value)} style={inp} />

        <label style={lbl}>Vorschau</label>
        <div style={{ border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.75rem', maxHeight: 260, overflowY: 'auto', background: 'var(--bg-primary,#F5F8F4)' }}
          dangerouslySetInnerHTML={{ __html: html }} />

        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button onClick={onClose} style={btnSecondary}>Abbrechen</button>
          <button onClick={handleSenden} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? 'Sende...' : '✉️ Senden'}</button>
        </div>
      </div>
    </div>
  )
}

const lbl = { display: 'block', color: 'var(--text-muted,#748575)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0.8rem 0 0.3rem' }
const inp = { width: '100%', boxSizing: 'border-box', background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.55rem 0.7rem', color: 'var(--text-primary,#17241A)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }
const btnPrimary = { background: 'var(--accent,#16A34A)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600 }
const btnSecondary = { background: 'transparent', color: 'var(--text-secondary,#3E4E40)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.55rem 1.1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }
