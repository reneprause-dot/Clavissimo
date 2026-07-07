/**
 * Clavissimo – Build-Information
 * ============================================================
 * EINZIGE STELLE für Versionsnummer, Datum und Entwickler.
 * Wird automatisch überall eingebunden wo Versionsinfos angezeigt werden.
 *
 * Neue Version: NUR hier ändern — Rest aktualisiert sich automatisch.
 * ============================================================
 */

export const BUILD_INFO = {
  version:    'v0.1.0',
  datum:      'Juli 2026',
  entwickler: 'René Prause',
  produkt:    'Clavissimo',
  // Automatisch berechnet
  jahr:       new Date().getFullYear(),
  volltext:   'v0.1.0 · Juli 2026',
}

// Für SQL-Inserts (erp_module version-Feld)
export const MODUL_VERSION = '0.1.0'

export default BUILD_INFO
