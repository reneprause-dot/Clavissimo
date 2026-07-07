/**
 * Clavissimo – E-Mail-Service (PLATZHALTER — noch aus Clavis ERP zu übernehmen)
 * ============================================================
 * Diese Datei existiert nur, damit Verkauf.jsx nicht beim Import crasht.
 * isEmailKonfiguriert() liefert bewusst `false`, damit die E-Mail-Buttons
 * in der UI sauber deaktiviert/versteckt bleiben, statt einen Fehler zu
 * werfen — bis die echte emailService.js aus deinem Clavis-ERP-Repo hier
 * eingesetzt wird.
 * ============================================================
 */

export function isEmailKonfiguriert() {
  return false
}

export async function ladeEmailConfig() {
  return null
}

export function erstelleRechnungsEmail(beleg, partner) {
  return {
    betreff: `Rechnung ${beleg?.belegnr || ''}`,
    text: 'E-Mail-Vorlage noch nicht eingerichtet.',
  }
}

export async function sendeEmail(config, mail) {
  console.warn('sendeEmail: emailService.js ist noch ein Platzhalter — bitte aus Clavis ERP übernehmen.')
  return { ok: false, error: 'E-Mail-Versand ist noch nicht konfiguriert.' }
}
