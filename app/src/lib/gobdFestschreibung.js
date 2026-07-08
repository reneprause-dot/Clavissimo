/**
 * Clavissimo – GoBD-Festschreibung
 * Schreibt alle Buchungen einer Periode (Monat) unveränderlich fest:
 * berechnet einen SHA-256-Hash über die Kernfelder aller Buchungen der
 * Periode, setzt festgeschrieben=true (danach greift die RLS-Sperre aus
 * 07_rls_rollen.sql — niemand kann diese Buchungen mehr ändern) und
 * dokumentiert das Ergebnis in gobd_perioden.
 */
import { getSupabaseClient } from './supabase'

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Lädt alle Perioden (festgeschrieben oder nicht) für die Übersicht. */
export async function ladeGobdPerioden() {
  const sb = getSupabaseClient()
  const { data } = await sb.from('gobd_perioden').select('*').order('periode', { ascending: false })
  return data || []
}

/**
 * Zeigt, wie viele noch nicht festgeschriebene Buchungen es für eine
 * Periode gibt (Vorschau, bevor man wirklich festschreibt).
 */
export async function pruefePeriode(periode) {
  const sb = getSupabaseClient()
  const [jahr, monat] = periode.split('-')
  const von = `${jahr}-${monat}-01`
  const bis = new Date(Number(jahr), Number(monat), 0).toISOString().slice(0, 10) // letzter Tag des Monats

  const { data, error } = await sb.from('buchungen')
    .select('id, festgeschrieben')
    .gte('datum', von).lte('datum', bis)

  if (error) return { anzahl: 0, offen: 0, error: error.message }
  const offen = (data || []).filter(b => !b.festgeschrieben).length
  return { anzahl: data?.length || 0, offen }
}

/**
 * Schreibt eine Periode fest. Erfordert role >= manager (wird zusätzlich
 * durch die RLS-Policy auf buchungen erzwungen, nicht nur hier geprüft).
 * @param {string} periode - 'JJJJ-MM'
 * @param {string} userId - erp_users.id
 */
export async function festschreibePeriode(periode, userId) {
  const sb = getSupabaseClient()
  const [jahr, monat] = periode.split('-')
  const von = `${jahr}-${monat}-01`
  const bis = new Date(Number(jahr), Number(monat), 0).toISOString().slice(0, 10)

  const { data: buchungen, error } = await sb.from('buchungen')
    .select('id, datum, beschreibung, soll_konto_id, haben_konto_id, betrag, steuerbetrag')
    .gte('datum', von).lte('datum', bis)
    .eq('festgeschrieben', false)
    .order('datum')

  if (error) return { ok: false, error: error.message }
  if (!buchungen || buchungen.length === 0) {
    return { ok: false, error: 'Keine offenen Buchungen in diesem Zeitraum gefunden.' }
  }

  // Hash über alle Kernfelder aller Buchungen der Periode (chronologisch,
  // damit derselbe Datensatz immer denselben Hash ergibt).
  const basis = buchungen.map(b => `${b.id}|${b.datum}|${b.beschreibung}|${b.soll_konto_id}|${b.haben_konto_id}|${b.betrag}|${b.steuerbetrag}`).join('\n')
  const hash = await sha256Hex(basis)

  const ids = buchungen.map(b => b.id)
  const { error: updateErr } = await sb.from('buchungen').update({ festgeschrieben: true }).in('id', ids)
  if (updateErr) return { ok: false, error: updateErr.message }

  const { error: periodeErr } = await sb.from('gobd_perioden').upsert({
    periode, typ: 'monat', festgeschrieben: true,
    festgeschrieben_am: new Date().toISOString(), festgeschrieben_von: userId,
    anzahl_buchungen: buchungen.length, hash_gesamt: hash,
  }, { onConflict: 'periode' })
  if (periodeErr) return { ok: false, error: periodeErr.message }

  return { ok: true, anzahl: buchungen.length, hash }
}
