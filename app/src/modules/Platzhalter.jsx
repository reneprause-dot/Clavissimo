export default function Platzhalter({ titel = 'Modul', icon = '🚧' }) {
  return (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
      <div style={{ color: 'var(--text-primary,#17241A)', fontWeight: 700, marginBottom: '0.4rem' }}>{titel}</div>
      <div style={{ color: 'var(--text-muted,#748575)', fontSize: '0.85rem' }}>
        Dieses Modul ist in der Registry angelegt, aber die Oberfläche fehlt noch.
      </div>
    </div>
  )
}
