/**
 * Clavissimo – Zeit-Helfer
 * Kleine, abhängigkeitsfreie Datums-/Zeit-Hilfsfunktionen.
 * (Existierte im hochgeladenen Clavis-ERP-Auszug nicht — hier neu
 * geschrieben, deckt die Verwendung in buchungslogik.js, Verkauf.jsx
 * und Einkauf.jsx ab. Falls dein echtes Clavis-ERP-Repo eine eigene
 * zeitHelfer.js mit abweichendem Verhalten hat, diese Datei damit
 * überschreiben statt zusammenführen.)
 */

/** Heutiges Datum als 'YYYY-MM-DD' (lokale Zeitzone) */
export function heute() {
  const d = new Date()
  return normDatum(d)
}

/** Aktueller Zeitpunkt als ISO-String */
export function jetzt() {
  return new Date().toISOString()
}

/**
 * Normalisiert ein Datum (Date-Objekt, ISO-String oder 'YYYY-MM-DD')
 * auf das Format 'YYYY-MM-DD'.
 */
export function normDatum(wert) {
  if (!wert) return ''
  const d = wert instanceof Date ? wert : new Date(wert)
  if (isNaN(d.getTime())) return ''
  const jj = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const tt = String(d.getDate()).padStart(2, '0')
  return `${jj}-${mm}-${tt}`
}

/**
 * Normalisiert eine Uhrzeit auf 'HH:MM'.
 */
export function normZeit(wert) {
  if (!wert) return ''
  const d = wert instanceof Date ? wert : new Date(wert)
  if (isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mi}`
}

/**
 * Berechnet ein Fälligkeitsdatum ab einem Startdatum + Zahlungsziel (Tage).
 * @param {string|Date} startDatum
 * @param {number} tage - Zahlungsziel in Tagen (Standard 14)
 * @returns {string} 'YYYY-MM-DD'
 */
export function faelligAm(startDatum, tage = 14) {
  const start = startDatum ? new Date(startDatum) : new Date()
  const fällig = new Date(start)
  fällig.setDate(fällig.getDate() + tage)
  return normDatum(fällig)
}

/** Anzahl Tage zwischen zwei Daten (positiv = b liegt nach a) */
export function tageZwischen(a, b) {
  const da = new Date(normDatum(a))
  const db = new Date(normDatum(b))
  return Math.round((db - da) / 86400000)
}
