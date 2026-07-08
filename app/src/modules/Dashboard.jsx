/**
 * Clavissimo – Dashboard
 * Ablaufende Erlaubnisse aus medcangCompliance.js. BtM-Bestand und
 * offene Meldepflichten (btm_meldungen) sind noch TODO — siehe Hinweis
 * unten (Dashboard-Kachel dafür fehlt noch, Datenbasis existiert).
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ladeAblaufendeErlaubnisse } from '../lib/medcangCompliance'
import { ladeBtmBestand, pruefeAktuelleMeldung } from '../lib/dashboardKpis'
import BUILD_INFO from '../lib/buildInfo'

export default function Dashboard() {
  const { erpUser } = useAuth()
  const [ablaufend, setAblaufend] = useState(null)
  const [btmBestand, setBtmBestand] = useState(null)
  const [meldung, setMeldung] = useState(null)

  useEffect(() => {
    ladeAblaufendeErlaubnisse(90).then(setAblaufend)
    ladeBtmBestand().then(setBtmBestand)
    pruefeAktuelleMeldung().then(setMeldung)
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
    </div>
  )
}

const kachel = { background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, padding: '1.1rem 1.25rem' }
const kachelLabel = { fontSize: '0.72rem', color: 'var(--text-muted,#748575)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }
const kachelWert = { fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary,#17241A)', fontFamily: 'monospace' }
const kachelSub = { fontSize: '0.72rem', color: 'var(--text-muted,#748575)', marginTop: '0.2rem' }

