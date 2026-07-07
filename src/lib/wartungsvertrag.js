/**
 * Clavissimo – Wartungsvertrag (rein informativ)
 *
 * WICHTIG: Das hier sperrt NICHTS. Clavissimo hat kein Lizenzsystem —
 * die Software funktioniert unabhängig vom Wartungsvertragsstatus
 * uneingeschränkt weiter. Diese Datei zeigt Admins lediglich an,
 * bis wann der Wartungsvertrag (Updates, Support, Anpassungen bei
 * Gesetzesänderungen) vertraglich läuft, damit rechtzeitig verlängert
 * werden kann. Keine Prüfung greift in isActive(), toggleModule() o.ä. ein.
 *
 * Ablaufdatum wird in der bereits vorhandenen `einstellungen`-Tabelle
 * gespeichert (key/value), genau wie z.B. 'firma_name'. Kein neues
 * Schema nötig.
 */
import { getSupabaseClient } from './supabase'

const EINSTELLUNG_KEY = 'wartungsvertrag_bis'

/**
 * Lädt das hinterlegte Wartungsvertrags-Enddatum (ISO-String 'YYYY-MM-DD').
 * Gibt null zurück, wenn noch keins gesetzt ist — dann wird nichts angezeigt.
 */
export async function ladeWartungsvertragBis() {
  try {
    const sb = getSupabaseClient()
    const { data } = await sb.from('einstellungen')
      .select('value').eq('key', EINSTELLUNG_KEY).maybeSingle()
    return data?.value || null
  } catch {
    return null
  }
}

/**
 * Setzt/aktualisiert das Wartungsvertrags-Enddatum (nur Admin-UI).
 * @param {string} datumIso - z.B. '2029-07-05'
 */
export async function setzeWartungsvertragBis(datumIso) {
  try {
    const sb = getSupabaseClient()
    const { error } = await sb.from('einstellungen').upsert({
      key: EINSTELLUNG_KEY,
      value: datumIso,
    }, { onConflict: 'key' })
    if (error) return { ok:false, error: error.message }
    return { ok:true }
  } catch (e) {
    return { ok:false, error: e.message }
  }
}

/**
 * Berechnet einen rein informativen Status aus dem Enddatum.
 * status: 'aktiv' | 'laeuft_bald_ab' | 'abgelaufen'
 * Schwelle für "läuft bald ab": 90 Tage (gleiche Logik wie bei den
 * Erlaubnis-Warnungen im Erlaubnis-Monitor, damit es sich vertraut anfühlt).
 */
export function wartungsStatus(datumIso, warnungTage = 90) {
  if (!datumIso) return null
  const bis = new Date(datumIso)
  const heute = new Date()
  const tageBis = Math.ceil((bis - heute) / 86400000)

  if (tageBis < 0) {
    return { status: 'abgelaufen', tageBis, label: 'Wartungsvertrag abgelaufen', farbe: 'danger' }
  }
  if (tageBis <= warnungTage) {
    return { status: 'laeuft_bald_ab', tageBis, label: `Wartungsvertrag läuft in ${tageBis} Tagen ab`, farbe: 'warning' }
  }
  return { status: 'aktiv', tageBis, label: 'Wartungsvertrag aktiv', farbe: 'success' }
}

export function formatDatumDe(datumIso) {
  if (!datumIso) return '–'
  return new Date(datumIso).toLocaleDateString('de-DE')
}
