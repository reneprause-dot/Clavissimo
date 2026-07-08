/**
 * Clavissimo – Buchungsjournal
 * Reine Leseansicht der buchungen-Tabelle (Anlegen läuft über die
 * Verkauf/Einkauf-Buchungslogik, nicht manuell hier — das hält die
 * Soll/Haben-Systematik konsistent).
 */
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'

function aktuellerMonat() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Buchhaltung() {
  const [buchungen, setBuchungen] = useState([])
  const [konten, setKonten] = useState([])
  const [loading, setLoading] = useState(true)
  const [monat, setMonat] = useState(aktuellerMonat())
  const [kontoFilter, setKontoFilter] = useState('')

  const load = async () => {
    setLoading(true)
    const sb = getSupabaseClient()
    const [jahr, mm] = monat.split('-')
    const von = `${jahr}-${mm}-01`
    const bis = new Date(Number(jahr), Number(mm), 0).toISOString().slice(0, 10)

    let query = sb.from('buchungen')
      .select('*, soll:konten!buchungen_soll_konto_id_fkey(nummer,bezeichnung), haben:konten!buchungen_haben_konto_id_fkey(nummer,bezeichnung)')
      .gte('datum', von).lte('datum', bis)
      .order('datum', { ascending: false })

    if (kontoFilter) query = query.or(`soll_konto_id.eq.${kontoFilter},haben_konto_id.eq.${kontoFilter}`)

    const { data } = await query
    setBuchungen(data || [])

    const { data: k } = await sb.from('konten').select('id,nummer,bezeichnung').eq('aktiv', true).order('nummer')
    setKonten(k || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [monat, kontoFilter])

  const summe = buchungen.reduce((s, b) => s + (parseFloat(b.betrag) || 0), 0)
  const offenAnzahl = buchungen.filter(b => !b.festgeschrieben).length

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary,#17241A)' }}>📒 Buchungsjournal</h1>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <input type="month" value={monat} onChange={e => setMonat(e.target.value)} style={inp} />
          <select value={kontoFilter} onChange={e => setKontoFilter(e.target.value)} style={inp}>
            <option value="">Alle Konten</option>
            {konten.map(k => <option key={k.id} value={k.id}>{k.nummer} – {k.bezeichnung}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={kachel}><div style={kachelLabel}>Buchungen {monat}</div><div style={kachelWert}>{buchungen.length}</div></div>
        <div style={kachel}><div style={kachelLabel}>Summe Beträge</div><div style={kachelWert}>€ {summe.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</div></div>
        <div style={kachel}>
          <div style={kachelLabel}>Noch nicht festgeschrieben</div>
          <div style={{ ...kachelWert, color: offenAnzahl > 0 ? 'var(--warning,#B4650F)' : 'var(--success,#16A34A)' }}>{offenAnzahl}</div>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ background: 'var(--bg-primary,#F5F8F4)' }}>
              {['Datum', 'Beleg', 'Beschreibung', 'Soll', 'Haben', 'Betrag', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', color: 'var(--text-muted,#748575)', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted,#748575)' }}>Lade…</td></tr>
              : buchungen.length === 0 ? <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted,#748575)' }}>Keine Buchungen in diesem Zeitraum</td></tr>
              : buchungen.map(b => (
                <tr key={b.id} style={{ borderTop: '1px solid var(--border,#DCE6DC)' }}>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary,#3E4E40)' }}>{new Date(b.datum).toLocaleDateString('de-DE')}</td>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted,#748575)' }}>{b.belegnr || '–'}</td>
                  <td style={{ padding: '0.6rem 1rem', color: 'var(--text-primary,#17241A)' }}>{b.beschreibung}</td>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary,#3E4E40)' }}>{b.soll?.nummer}</td>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary,#3E4E40)' }}>{b.haben?.nummer}</td>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary,#17241A)' }}>€ {parseFloat(b.betrag).toFixed(2)}</td>
                  <td style={{ padding: '0.6rem 1rem' }}>
                    <span style={{
                      padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 600,
                      background: b.festgeschrieben ? 'var(--success,#16A34A)18' : 'var(--warning,#B4650F)18',
                      color: b.festgeschrieben ? 'var(--success,#16A34A)' : 'var(--warning,#B4650F)',
                    }}>
                      {b.festgeschrieben ? '🔒 fest' : 'offen'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--text-muted,#748575)' }}>
        Festschreibung (Periode sperren) unter Einstellungen → GoBD-Festschreibung.
      </p>
    </div>
  )
}

const inp = { background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.5rem 0.7rem', color: 'var(--text-primary,#17241A)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }
const kachel = { background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, padding: '1rem 1.2rem' }
const kachelLabel = { fontSize: '0.7rem', color: 'var(--text-muted,#748575)', textTransform: 'uppercase', marginBottom: '0.3rem' }
const kachelWert = { fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary,#17241A)' }
