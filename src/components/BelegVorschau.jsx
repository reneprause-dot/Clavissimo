/**
 * Clavissimo – BelegVorschau (PLATZHALTER — noch aus Clavis ERP zu übernehmen)
 * Rendert nur einen Hinweis, damit Verkauf.jsx/Einkauf.jsx nicht crashen.
 * Nimmt beliebige Props entgegen und ignoriert sie.
 */
export default function BelegVorschau(props) {
  return (
    <div style={{
      padding: '2rem', textAlign: 'center', color: 'var(--text-muted,#748575)',
      background: 'var(--bg-secondary,#fff)', border: '1px dashed var(--border,#DCE6DC)',
      borderRadius: 12, fontSize: '0.85rem',
    }}>
      📄 Belegvorschau ist noch nicht eingerichtet.<br />
      Bitte <code>BelegVorschau.jsx</code> aus Clavis ERP übernehmen.
    </div>
  )
}
