/**
 * Clavissimo – Dashboard
 * Ablaufende Erlaubnisse aus medcangCompliance.js. BtM-Bestand und
 * offene Meldepflichten (btm_meldungen) sind noch TODO — siehe Hinweis
 * unten (Dashboard-Kachel dafür fehlt noch, Datenbasis existiert).
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ladeAblaufendeErlaubnisse } from '../lib/medcangCompliance'
import { ladeBtmBestand, pruefeAktuelleMeldung, ladeGesamtBestand } from '../lib/dashboardKpis'
import BUILD_INFO from '../lib/buildInfo'

export default function Dashboard() {
  const { erpUser } = useAuth()
  const [ablaufend, setAblaufend] = useState(null)
  const [btmBestand, setBtmBestand] = useState(null)
  const [meldung, setMeldung] = useState(null)
  const [bestandsliste, setBestandsliste] = useState(null)
  const [suche, setSuche] = useState('')
  const [nurKritisch, setNurKritisch] = useState(false)

  useEffect(() => {
    ladeAblaufendeErlaubnisse(90).then(setAblaufend)
    ladeBtmBestand().then(setBtmBestand)
    pruefeAktuelleMeldung().then(setMeldung)
    ladeGesamtBestand().then(setBestandsliste)
  }, [])

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.3rem', color: 'var(--text-primary,#17241A)' }}>
        👋 Willkommen{erpUser?.name ? `, ${erpUser.name}` : ''}
      </h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted,#748575)' }}>
        {BUILD_INFO.produkt} {BUILD_INFO.version}
      </p>

      {/* ── KPI-Kacheln ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={kachel}>
          <div style={kachelLabel}>🌿 BtM-Bestand (gesamt)</div>
          <div style={kachelWert}>
            {btmBestand === null ? '…' : btmBestand.gesamt.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
          </div>
          <div style={kachelSub}>{btmBestand?.artikel.length ?? 0} BtM-pflichtige Artikel</div>
        </div>

        <div style={kachel}>
          <div style={kachelLabel}>📕 BtM-Meldung {meldung?.monat}</div>
          <div style={{ ...kachelWert, fontSize: '1.1rem', color: meldung?.status === 'gemeldet' ? 'var(--success,#16A34A)' : 'var(--warning,#B4650F)' }}>
            {meldung === null ? '…' : meldung.status === 'gemeldet' ? '✓ Gemeldet' : meldung.vorhanden ? 'Entwurf offen' : 'Noch nicht angelegt'}
          </div>
          <div style={kachelSub}>Meldepflicht §13 BtMVV</div>
        </div>

        <div style={kachel}>
          <div style={kachelLabel}>📋 Erlaubnisse ≤ 90 Tage</div>
          <div style={{ ...kachelWert, color: (ablaufend?.length ?? 0) > 0 ? 'var(--warning,#B4650F)' : 'var(--success,#16A34A)' }}>
            {ablaufend === null ? '…' : ablaufend.length}
          </div>
          <div style={kachelSub}>Partner mit ablaufender Erlaubnis</div>
        </div>
      </div>

      <div style={{
        background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)',
        borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1rem',
      }}>
        <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.95rem', color: 'var(--text-primary,#17241A)' }}>
          📋 Ablaufende Erlaubnisse (≤ 90 Tage)
        </h3>
        {ablaufend === null ? (
          <div style={{ color: 'var(--text-muted,#748575)', fontSize: '0.85rem' }}>Lade…</div>
        ) : ablaufend.length === 0 ? (
          <div style={{ color: 'var(--success,#16A34A)', fontSize: '0.85rem' }}>✓ Keine Erlaubnisse laufen bald ab.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {ablaufend.map(p => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem',
                padding: '0.5rem 0.7rem', background: 'var(--warning,#B4650F)11', borderRadius: 8,
                color: 'var(--warning,#B4650F)',
              }}>
                <span>{p.name}</span>
                <span style={{ fontFamily: 'monospace' }}>
                  MedCanG: {p.medcang_erlaubnis_gueltig || '–'} · BtM: {p.btm_erlaubnis_gueltig || '–'} · GDP: {p.gdp_zertifikat_gueltig || '–'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bestandsliste ───────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)',
        borderRadius: 12, padding: '1.25rem 1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.6rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary,#17241A)' }}>
            📦 Bestandsliste
          </h3>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary,#3E4E40)', cursor: 'pointer' }}>
              <input type="checkbox" checked={nurKritisch} onChange={e => setNurKritisch(e.target.checked)} />
              Nur unter Mindestbestand
            </label>
            <input
              value={suche} onChange={e => setSuche(e.target.value)} placeholder="Artikel suchen…"
              style={{ background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.4rem 0.7rem', fontSize: '0.78rem', fontFamily: 'inherit', color: 'var(--text-primary,#17241A)', outline: 'none', width: 180 }}
            />
          </div>
        </div>

        {bestandsliste === null ? (
          <div style={{ color: 'var(--text-muted,#748575)', fontSize: '0.85rem' }}>Lade…</div>
        ) : (() => {
          const gefiltert = bestandsliste
            .filter(a => !suche || a.bezeichnung.toLowerCase().includes(suche.toLowerCase()) || a.artikelnr.toLowerCase().includes(suche.toLowerCase()))
            .filter(a => !nurKritisch || (a.mindestbestand > 0 && a.bestand <= a.mindestbestand))
            .sort((a, b) => {
              const aKritisch = a.mindestbestand > 0 && a.bestand <= a.mindestbestand
              const bKritisch = b.mindestbestand > 0 && b.bestand <= b.mindestbestand
              if (aKritisch !== bKritisch) return aKritisch ? -1 : 1
              return a.bezeichnung.localeCompare(b.bezeichnung)
            })

          if (gefiltert.length === 0) {
            return <div style={{ color: 'var(--text-muted,#748575)', fontSize: '0.85rem', padding: '1rem 0', textAlign: 'center' }}>Keine Artikel gefunden.</div>
          }

          return (
            <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead><tr style={{ position: 'sticky', top: 0, background: 'var(--card-bg,#fff)' }}>
                  {['Artikel', 'Lagerort', 'Bestand', 'Mindest', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.7rem', textAlign: 'left', color: 'var(--text-muted,#748575)', fontWeight: 600, fontSize: '0.66rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border,#DCE6DC)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {gefiltert.map(a => {
                    const kritisch = a.mindestbestand > 0 && a.bestand <= a.mindestbestand
                    return (
                      <tr key={a.id} style={{ borderTop: '1px solid var(--border,#DCE6DC)' }}>
                        <td style={{ padding: '0.5rem 0.7rem', color: 'var(--text-primary,#17241A)' }}>
                          {a.bezeichnung}
                          {a.btm_pflichtig && <span style={{ marginLeft: '0.4rem', fontSize: '0.62rem', fontWeight: 700, background: 'var(--warning,#B4650F)18', color: 'var(--warning,#B4650F)', padding: '0.05rem 0.35rem', borderRadius: 4 }}>BtM</span>}
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted,#748575)' }}>{a.artikelnr}</div>
                        </td>
                        <td style={{ padding: '0.5rem 0.7rem', color: 'var(--text-secondary,#3E4E40)', fontSize: '0.75rem' }}>{a.lagerort || '–'}</td>
                        <td style={{ padding: '0.5rem 0.7rem', fontFamily: 'monospace', fontWeight: 600, color: kritisch ? 'var(--danger,#B3261E)' : 'var(--text-primary,#17241A)' }}>{a.bestand} {a.einheit}</td>
                        <td style={{ padding: '0.5rem 0.7rem', fontFamily: 'monospace', color: 'var(--text-muted,#748575)' }}>{a.mindestbestand || 0}</td>
                        <td style={{ padding: '0.5rem 0.7rem' }}>
                          {kritisch ? (
                            <span style={{ background: 'var(--danger,#B3261E)18', color: 'var(--danger,#B3261E)', padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 600 }}>⚠ Unter Mindest</span>
                          ) : (
                            <span style={{ background: 'var(--success,#16A34A)18', color: 'var(--success,#16A34A)', padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.68rem' }}>✓ OK</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

const kachel = { background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, padding: '1.1rem 1.25rem' }
const kachelLabel = { fontSize: '0.72rem', color: 'var(--text-muted,#748575)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }
const kachelWert = { fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary,#17241A)', fontFamily: 'monospace' }
const kachelSub = { fontSize: '0.72rem', color: 'var(--text-muted,#748575)', marginTop: '0.2rem' }

