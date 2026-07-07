/**
 * Clavissimo – Einstellungen
 * Admin-Bereich: optionale Module ein-/ausschalten + Wartungsvertrag.
 */
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { MODUL_REGISTRY } from '../lib/modulDefinitionen'
import WartungsvertragEinstellung from './WartungsvertragEinstellung'
import OptionslisteVerwaltung from './OptionslisteVerwaltung'

export default function Einstellungen() {
  const { hasRole } = useAuth()
  const { isGlobalActive, toggleModule } = useModules()

  const optionaleModule = MODUL_REGISTRY.filter(m => !m.kern && m.key !== 'einstellungen')

  if (!hasRole('admin')) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted,#748575)' }}>Nur für Admins sichtbar.</div>
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary,#17241A)' }}>⚙️ Einstellungen</h1>

      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, padding: '1.25rem 1.5rem', maxWidth: 480 }}>
        <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.95rem', color: 'var(--text-primary,#17241A)' }}>
          🧩 Optionale Module
        </h3>
        {optionaleModule.map(m => (
          <label key={m.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.6rem 0', borderTop: '1px solid var(--border,#DCE6DC)', fontSize: '0.85rem',
          }}>
            <span>{m.icon} {m.label}</span>
            <input
              type="checkbox"
              checked={isGlobalActive(m.key)}
              onChange={e => toggleModule(m.key, e.target.checked, hasRole)}
            />
          </label>
        ))}
      </div>

      <WartungsvertragEinstellung />

      <div>
        <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.95rem', color: 'var(--text-primary,#17241A)' }}>
          🗂️ Stammdaten-Listen (Artikelkarte)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          <OptionslisteVerwaltung tabelle="artikel_kategorien" label="Kategorie" icon="🗂️" />
          <OptionslisteVerwaltung tabelle="sorten" label="Sorte" icon="🌿" />
          <OptionslisteVerwaltung tabelle="medcang_kategorien" label="MedCanG-Kategorie" icon="🌿" />
          <OptionslisteVerwaltung tabelle="amg_kategorien" label="AMG-Kategorie" icon="⚕️" />
          <OptionslisteVerwaltung tabelle="gmp_klassen" label="GMP-Klasse" icon="✅" />
          <OptionslisteVerwaltung tabelle="temperaturklassen" label="Temperaturklasse" icon="🌡️" />
        </div>
      </div>
    </div>
  )
}
