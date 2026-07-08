/**
 * Clavissimo – Dashboard (Basisversion)
 * TODO gemäß CLAVISSIMO_SPEC.md: BtM-Bestand-KPI, ablaufende Erlaubnisse
 * (aus geschaeftspartner + erlaubnis_warnungen), offene Meldepflichten
 * (btm_meldungen). Hier erstmal ein einfacher Einstiegspunkt, damit die
 * Navigation funktioniert.
 */
import { useAuth } from '../context/AuthContext'
import BUILD_INFO from '../lib/buildInfo'

export default function Dashboard() {
  const { erpUser } = useAuth()

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.3rem', color: 'var(--text-primary,#17241A)' }}>
        👋 Willkommen{erpUser?.name ? `, ${erpUser.name}` : ''}
      </h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted,#748575)' }}>
        {BUILD_INFO.produkt} {BUILD_INFO.version}
      </p>

      <div style={{
        background: 'var(--card-bg,#fff)', border: '1px dashed var(--border,#DCE6DC)',
        borderRadius: 12, padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted,#748575)',
      }}>
        TODO: BtM-Bestand-Übersicht, ablaufende Erlaubnisse (aus <code>geschaeftspartner</code> /
        <code> erlaubnis_warnungen</code>) und offene Meldepflichten (<code>btm_meldungen</code>)
        hier als KPI-Kacheln ergänzen — siehe CLAVISSIMO_SPEC.md, Abschnitt „Kritische Business-Logik“.
      </div>
    </div>
  )
}
