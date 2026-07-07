/**
 * Clavissimo – Audit-Trail (minimal)
 * Schreibt jede Änderung in die vorhandene gobd_protokoll-Tabelle.
 * Falls dein Clavis-ERP-auditTrail.js umfangreicher ist (z.B. Diff-Berechnung,
 * Vorher/Nachher-Werte), diese Datei damit ersetzen.
 */
import { getSupabaseClient } from './supabase'

export async function logAudit(aktion, details = {}) {
  try {
    const sb = getSupabaseClient()
    await sb.from('gobd_protokoll').insert({
      aktion,
      details,
      erstellt_at: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('logAudit konnte nicht schreiben:', e.message)
  }
}
