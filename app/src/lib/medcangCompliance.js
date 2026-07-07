/**
 * Clavissimo – MedCanG-Compliance-Prüfungen
 * Zentrale Stelle für die Erlaubnisprüfung, wie in CLAVISSIMO_SPEC.md
 * ("Kritische Business-Logik") beschrieben. Wird von modulIntegration.js
 * (Verkauf-Hook) und optional direkt von UI-Komponenten genutzt.
 */
import { getSupabaseClient } from './supabase'

/**
 * Prüft, ob ein Geschäftspartner eine gültige MedCanG- und BtM-Erlaubnis
 * hat. Jeder Verkauf in Clavissimo ist Cannabis-bezogen, daher werden
 * beide Erlaubnisse grundsätzlich geprüft (nicht nur bei BtM-pflichtigen
 * Positionen) — das entspricht der Logik aus der Spec.
 *
 * @param {string} partnerId
 * @returns {{ erlaubt: boolean, warnungen: string[] }}
 */
export async function pruefeErlaubnis(partnerId) {
  if (!partnerId) return { erlaubt: false, warnungen: ['Kein Kunde ausgewählt.'] }

  const sb = getSupabaseClient()
  const { data: partner, error } = await sb.from('geschaeftspartner')
    .select('name, medcang_erlaubnis_gueltig, btm_erlaubnis_gueltig, gdp_zertifikat_gueltig')
    .eq('id', partnerId).single()

  if (error || !partner) {
    return { erlaubt: false, warnungen: ['Geschäftspartner konnte nicht geladen werden.'] }
  }

  const heute = new Date().toISOString().slice(0, 10)
  const warnungen = []

  if (!partner.medcang_erlaubnis_gueltig || partner.medcang_erlaubnis_gueltig < heute) {
    warnungen.push(`MedCanG-Erlaubnis von ${partner.name} fehlt oder ist abgelaufen.`)
  }
  if (!partner.btm_erlaubnis_gueltig || partner.btm_erlaubnis_gueltig < heute) {
    warnungen.push(`BtM-Erlaubnis von ${partner.name} fehlt oder ist abgelaufen.`)
  }

  return { erlaubt: warnungen.length === 0, warnungen }
}

/**
 * Liefert Ablauf-Informationen für den Erlaubnis-Monitor/Dashboard:
 * alle aktiven Partner, deren Erlaubnisse innerhalb von `warnungTage`
 * ablaufen oder bereits abgelaufen sind.
 */
export async function ladeAblaufendeErlaubnisse(warnungTage = 90) {
  const sb = getSupabaseClient()
  const grenze = new Date()
  grenze.setDate(grenze.getDate() + warnungTage)
  const grenzeIso = grenze.toISOString().slice(0, 10)

  const { data, error } = await sb.from('geschaeftspartner')
    .select('id, name, medcang_erlaubnis_gueltig, btm_erlaubnis_gueltig, gdp_zertifikat_gueltig')
    .eq('aktiv', true)
    .or(`medcang_erlaubnis_gueltig.lte.${grenzeIso},btm_erlaubnis_gueltig.lte.${grenzeIso},gdp_zertifikat_gueltig.lte.${grenzeIso}`)

  if (error) return []
  return data || []
}
