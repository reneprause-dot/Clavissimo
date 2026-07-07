/**
 * Clavis ERP – Zentraler Datenbankaufruf-Helper
 *
 * Kapselt das Muster "Supabase-Aufruf + Fehlerprüfung" an einer Stelle,
 * damit es konsistent im gesamten Projekt wiederverwendet werden kann.
 *
 * Verwendung:
 *   const { data, error } = await dbCall(
 *     sb.from('artikel').update(form).eq('id', item.id),
 *     { fehlermeldung: 'Artikel konnte nicht gespeichert werden' }
 *   )
 *   if (error) { showMsg(false, error.message); return }
 */

export async function dbCall(promise, { fehlermeldung, onError } = {}) {
  try {
    const { data, error } = await promise
    if (error) {
      console.error(fehlermeldung || 'Datenbankfehler:', error.message)
      if (onError) onError(error)
      return { data: null, error }
    }
    return { data, error: null }
  } catch (e) {
    console.error(fehlermeldung || 'Unerwarteter Fehler:', e.message)
    if (onError) onError(e)
    return { data: null, error: e }
  }
}

export async function dbCallOderAbbrechen(promise, { fehlermeldung, showMsg } = {}) {
  const { error } = await dbCall(promise, { fehlermeldung })
  if (error) {
    if (showMsg) showMsg(false, `${fehlermeldung || 'Fehler'}: ${error.message}`)
    return false
  }
  return true
}
