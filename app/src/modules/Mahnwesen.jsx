import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ladeOffenePosten, erstelleMahnung, tageUeberfaellig, MAHNSTUFEN } from '../lib/mahnwesen'
import { druckMahnung } from '../lib/pdfExport'
import { sendeEmail } from '../lib/emailService'

export default function Mahnwesen() {
  const { hasRole, erpUser } = useAuth()
  const [posten, setPosten] = useState([])
  const [firma, setFirma] = useState({})
  const [loading, setLoading] = useState(true)
  const [nurUeberfaellig, setNurUeberfaellig] = useState(true)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)
  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000) }

  const load = async () => {
    setLoading(true)
    setPosten(await ladeOffenePosten())
    const sb = getSupabaseClient()
    const { data } = await sb.from('einstellungen').select('key,value').like('key', 'firma_%')
    const map = {}
    ;(data || []).forEach(e => { map[e.key.replace('firma_', '')] = e.value })
    setFirma(map)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const gefiltert = posten.filter(op => !nurUeberfaellig || tageUeberfaellig(op) > 0)
  const summeOffen = gefiltert.reduce((s, op) => s + (parseFloat(op.offen) || 0), 0)

  const handleMahnungDrucken = async (op) => {
    setBusy(op.id)
    const res = await erstelleMahnung(op, erpUser?.id, 'druck')
    setBusy(null)
    if (!res.ok) { showMsg(false, res.error); return }
    try {
      druckMahnung({ op, stufe: res.stufe, firma })
      showMsg(true, `Mahnstufe ${res.stufe} für ${op.belegnr} protokolliert und gedruckt.`)
    } catch (e) {
      showMsg(false, e.message)
    }
    load()
  }

  const handleMahnungPerMail = async (op) => {
    if (!op.partner?.email) { showMsg(false, 'Partner hat keine E-Mail-Adresse hinterlegt.'); return }
    setBusy(op.id)
    const res = await erstelleMahnung(op, erpUser?.id, 'email')
    if (!res.ok) { setBusy(null); showMsg(false, res.error); return }
    const info = MAHNSTUFEN.find(m => m.stufe === res.stufe)
    const mailRes = await sendeEmail({
      to: op.partner.email,
      subject: `${info?.label || 'Mahnung'} – Beleg ${op.belegnr}`,
      html: `<p>Sehr geehrte Damen und Herren,</p><p>die Rechnung ${op.belegnr} über € ${parseFloat(op.offen).toFixed(2)} ist weiterhin offen (fällig seit ${new Date(op.faelligkeitsdatum).toLocaleDateString('de-DE')}). Bitte begleichen Sie den Betrag zeitnah.</p><p>Mit freundlichen Grüßen<br>${firma.name || ''}</p>`,
    })
    setBusy(null)
    if (!mailRes.ok) { showMsg(false, `Protokolliert, aber Versand fehlgeschlagen: ${mailRes.error}`); load(); return }
    showMsg(true, `Mahnstufe ${res.stufe} für ${op.belegnr} per E-Mail versendet.`)
    load()
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary,#17241A)' }}>📨 Mahnwesen</h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary,#3E4E40)', cursor: 'pointer' }}>
          <input type="checkbox" checked={nurUeberfaellig} onChange={e => setNurUeberfaellig(e.target.checked)} />
          Nur überfällige anzeigen
        </label>
      </div>

      {msg && (
        <div style={{ padding: '0.6rem 0.9rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1rem', background: msg.ok ? 'var(--success,#16A34A)18' : 'var(--danger,#B3261E)18', color: msg.ok ? 'var(--success,#16A34A)' : 'var(--danger,#B3261E)' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={kachel}><div style={kachelLabel}>Offene Posten</div><div style={kachelWert}>{gefiltert.length}</div></div>
        <div style={kachel}><div style={kachelLabel}>Summe offen</div><div style={kachelWert}>€ {summeOffen.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</div></div>
      </div>

      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ background: 'var(--bg-primary,#F5F8F4)' }}>
              {['Kunde', 'Beleg', 'Fällig seit', 'Tage überfällig', 'Betrag offen', 'Mahnstufe', ''].map(h => (
                <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', color: 'var(--text-muted,#748575)', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted,#748575)' }}>Lade…</td></tr>
              : gefiltert.length === 0 ? <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--success,#16A34A)' }}>✓ Keine offenen Posten</td></tr>
              : gefiltert.map(op => {
                const tage = tageUeberfaellig(op)
                const stufeInfo = MAHNSTUFEN.find(m => m.stufe === (op.mahnstufe || 0))
                return (
                  <tr key={op.id} style={{ borderTop: '1px solid var(--border,#DCE6DC)' }}>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-primary,#17241A)' }}>{op.partner?.name || '–'}</td>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted,#748575)' }}>{op.belegnr}</td>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary,#3E4E40)' }}>{op.faelligkeitsdatum ? new Date(op.faelligkeitsdatum).toLocaleDateString('de-DE') : '–'}</td>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: tage > 0 ? 'var(--danger,#B3261E)' : 'var(--text-secondary,#3E4E40)' }}>{tage > 0 ? `${tage} Tg.` : '–'}</td>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary,#17241A)' }}>€ {parseFloat(op.offen).toFixed(2)}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{
                        padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 600,
                        background: (op.mahnstufe || 0) === 0 ? 'var(--text-muted,#748575)18' : (op.mahnstufe >= 3 ? 'var(--danger,#B3261E)18' : 'var(--warning,#B4650F)18'),
                        color: (op.mahnstufe || 0) === 0 ? 'var(--text-muted,#748575)' : (op.mahnstufe >= 3 ? 'var(--danger,#B3261E)' : 'var(--warning,#B4650F)'),
                      }}>
                        {stufeInfo?.label || 'Keine Mahnung'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      {hasRole('user') && (op.mahnstufe || 0) < 3 && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => handleMahnungDrucken(op)} disabled={busy === op.id} style={btnMini}>🖨️ Drucken</button>
                          <button onClick={() => handleMahnungPerMail(op)} disabled={busy === op.id || !op.partner?.email} style={{ ...btnMini, opacity: op.partner?.email ? 1 : 0.4 }} title={op.partner?.email ? '' : 'Keine E-Mail hinterlegt'}>✉️ Mailen</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--text-muted,#748575)' }}>
        Jede Mahnung wird protokolliert (nachträglich nicht änderbar) — maximal Mahnstufe 3 (letzte Mahnung).
      </p>
    </div>
  )
}

const kachel = { background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, padding: '1rem 1.2rem' }
const kachelLabel = { fontSize: '0.7rem', color: 'var(--text-muted,#748575)', textTransform: 'uppercase', marginBottom: '0.3rem' }
const kachelWert = { fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary,#17241A)' }
const btnMini = { background: 'transparent', border: '1px solid var(--border,#DCE6DC)', color: 'var(--text-secondary,#3E4E40)', borderRadius: 6, padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit', whiteSpace: 'nowrap' }
