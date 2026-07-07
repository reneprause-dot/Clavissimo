/**
 * Clavissimo – EmailPanel (PLATZHALTER — noch aus Clavis ERP zu übernehmen)
 */
export default function EmailPanel(props) {
  return (
    <div style={{
      padding: '1rem', color: 'var(--text-muted,#748575)',
      background: 'var(--bg-secondary,#fff)', border: '1px dashed var(--border,#DCE6DC)',
      borderRadius: 10, fontSize: '0.8rem',
    }}>
      ✉️ E-Mail-Versand ist noch nicht eingerichtet (siehe <code>emailService.js</code>).
    </div>
  )
}
