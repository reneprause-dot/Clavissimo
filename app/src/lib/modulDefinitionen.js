/**
 * CLAVISSIMO – Modul-Registry
 * Schlanke Variante von CLAVIS ERP modulDefinitionen.js:
 * nur die für Cannabis-Großhändler/-Hersteller relevanten ~12 Module
 * statt der vollen 42-Module-Registry (siehe CLAVISSIMO_SPEC.md).
 *
 * Schema ist 1:1 kompatibel zu ModuleContext.jsx und AppLayout.jsx aus
 * Clavis ERP — beide können unverändert übernommen werden.
 *
 * Bewusst NICHT übernommen aus der großen Registry:
 *   - BUCHUNGSLOGIK_MATRIX, MODUL_INTEGRATIONEN, MODUL_BERECHTIGUNGEN,
 *     FESTE_BUCHUNGSVERKNUEPFUNGEN etc. — das ist Overhead für ein
 *     Mehrbranchen-System. Falls eine Admin-Berechtigungsseite oder das
 *     Integrations-Dashboard aus Clavis ERP übernommen wird, müssen diese
 *     Exporte hier ergänzt werden.
 */

export const MODUL_REGISTRY = [
  // Dashboard – immer aktiv, kein Toggle
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    gruppe: null,
    beschreibung: 'BtM-Bestand, ablaufende Erlaubnisse, offene Meldepflichten',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },

  // ── 🗂️ Stammdaten ──────────────────────────────────────────────────────
  {
    key: 'artikel',
    label: 'Artikelstamm',
    icon: '📦',
    gruppe: '🗂️ Stammdaten',
    beschreibung: 'Artikel mit PZN, THC/CBD, Sorte, BtM-pflichtig, AMG-Kategorie',
    schutzTabelle: 'artikel',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },
  {
    key: 'partner',
    label: 'Partnerstamm',
    icon: '👥',
    gruppe: '🗂️ Stammdaten',
    beschreibung: 'Kunden/Lieferanten mit Erlaubnis-Tracking (§52a AMG, BtM, GDP)',
    schutzTabelle: 'geschaeftspartner',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },

  // ── 📦 Lager & Logistik ────────────────────────────────────────────────
  {
    key: 'lager',
    label: 'Lager',
    icon: '🏭',
    gruppe: '📦 Lager & Logistik',
    beschreibung: 'Bestandsführung mit Chargenpflicht, BtM-Kennzeichen, Quarantäne',
    schutzTabelle: 'artikelbewegungen',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },
  {
    key: 'wms',
    label: 'Lagerverwaltung (WMS)',
    icon: '📍',
    gruppe: '📦 Lager & Logistik',
    beschreibung: 'Lagerplätze, Wareneingang/-ausgang, Chargenrückverfolgung',
    schutzTabelle: 'lagerorte',
    kern: true, aktiv: true, pflicht: false, adminOnly: false,
  },

  // ── 🛒 Einkauf & Verkauf ───────────────────────────────────────────────
  {
    key: 'einkauf',
    label: 'Einkauf',
    icon: '📥',
    gruppe: '🛒 Einkauf & Verkauf',
    beschreibung: 'Lieferantenrechnungen, Wareneingang mit CoA-Pflicht',
    schutzTabelle: 'einkaufsbelege',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },
  {
    key: 'verkauf',
    label: 'Verkauf',
    icon: '🛒',
    gruppe: '🛒 Einkauf & Verkauf',
    beschreibung: 'Aufträge/Rechnungen mit Erlaubnisprüfung vor Auftragsanlage',
    schutzTabelle: 'verkaufsbelege',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },

  // ── 💼 Finanzen & Buchhaltung ──────────────────────────────────────────
  {
    key: 'buchhaltung',
    label: 'Buchungsjournal',
    icon: '📒',
    gruppe: '💼 Finanzen & Buchhaltung',
    beschreibung: 'SKR04-Buchungsjournal, GoBD-konform',
    schutzTabelle: 'buchungen',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },
  {
    key: 'mahnwesen',
    label: 'Mahnwesen',
    icon: '📨',
    gruppe: '💼 Finanzen & Buchhaltung',
    beschreibung: 'Offene Posten, Mahnläufe',
    schutzTabelle: 'offene_posten',
    kern: true, aktiv: true, pflicht: false, adminOnly: false,
  },
  {
    key: 'datev',
    label: 'DATEV Export',
    icon: '📤',
    gruppe: '💼 Finanzen & Buchhaltung',
    beschreibung: 'Buchungsstapel für Steuerberater-Anbindung',
    kern: false, aktiv: false, pflicht: false, adminOnly: false,
  },
  {
    key: 'gobd',
    label: 'GoBD-Konformität',
    icon: '🔒',
    gruppe: '💼 Finanzen & Buchhaltung',
    beschreibung: 'SHA-256 Hash, Festschreibung von Buchungen',
    schutzTabelle: 'gobd_protokoll',
    kern: false, aktiv: false, pflicht: false, adminOnly: false,
  },

  // ── 🌿 Cannabis-Compliance (Kern von Clavissimo) ───────────────────────
  {
    key: 'medcang',
    label: 'MedCanG Cannabis',
    icon: '🌿',
    gruppe: '🌿 Compliance',
    beschreibung: 'Cannabis-Artikel, Chargen & CoA, Erlaubnismanagement, Vorschriften-Wiki',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },
  {
    key: 'btm_buch',
    label: 'BtM-Buch',
    icon: '📕',
    gruppe: '🌿 Compliance',
    beschreibung: 'Zugangs-/Abgangsbuch nach §13 BtMVV, monatliche Bestandsabgleiche',
    schutzTabelle: 'btm_buch',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },
  {
    key: 'erlaubnis_monitor',
    label: 'Erlaubnis-Monitor',
    icon: '📋',
    gruppe: '🌿 Compliance',
    beschreibung: 'Ablauf-Überwachung §52a AMG, BtM-Erlaubnis, GDP-Zertifikat',
    schutzTabelle: 'erlaubnis_warnungen',
    kern: true, aktiv: true, pflicht: true, adminOnly: false,
  },

  // ── 🎯 Qualität (optional aktivierbar) ─────────────────────────────────
  {
    key: 'qm',
    label: 'eQMS (Qualitätsmanagement)',
    icon: '✅',
    gruppe: '🎯 Qualität & Compliance',
    beschreibung: 'CAPA, Audits, Dokumente — bei GMP/GDP-Zertifizierungsanforderungen',
    branche: true, kern: false, aktiv: false, pflicht: false, adminOnly: false,
  },

  // ── 👥 Personal (optional aktivierbar) ─────────────────────────────────
  {
    key: 'personal',
    label: 'Personal & Zeiterfassung',
    icon: '👤',
    gruppe: '👥 Personal & Zeit',
    beschreibung: 'Mitarbeiter, Schulungsnachweise für GDP',
    schutzTabelle: 'mitarbeiter',
    kern: false, aktiv: false, pflicht: false, adminOnly: false,
  },

  // ── 🛡️ Administration ──────────────────────────────────────────────────
  {
    key: 'nutzerverwaltung',
    label: 'Nutzerverwaltung',
    icon: '👤',
    gruppe: null,
    beschreibung: 'Nutzer einladen, Rollen verwalten',
    kern: true, aktiv: true, pflicht: true, adminOnly: true,
  },
  {
    key: 'einstellungen',
    label: 'Einstellungen',
    icon: '⚙️',
    gruppe: null,
    beschreibung: 'Systemkonfiguration, Nutzerverwaltung, Modul-Aktivierung',
    kern: true, aktiv: true, pflicht: true, adminOnly: true,
  },
]

export const MODUL_ICON_MAP = {
  dashboard:'📊', artikel:'📦', partner:'👥', lager:'🏭', wms:'📍',
  einkauf:'📥', verkauf:'🛒', buchhaltung:'📒', mahnwesen:'📨',
  datev:'📤', gobd:'🔒', medcang:'🌿', btm_buch:'📕',
  erlaubnis_monitor:'📋', qm:'✅', personal:'👤', einstellungen:'⚙️',
}
