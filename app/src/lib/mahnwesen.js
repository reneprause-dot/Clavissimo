/**
 * Clavissimo – Mahnwesen
 */
import { getSupabaseClient } from './supabase'

export const MAHNSTUFEN = [
  { stufe: 0, label: 'Keine Mahnung', kulanz: true },
  { stufe: 1, label: 'Zahlungserinnerung', ton: 'freundlich' },
  { stufe: 2, label: '1. Mahnung', ton: 'bestimmt' },
  { stufe: 3, label: '2. Mahnung (letzte)', ton: 'ernst' },
]

export function tageUeberfaellig(op) {
  if (!op.faelligkeitsdatum) return 0
  const heute = new Date()
  const faellig = new Date(op.faelligkeitsdatum)
  return Math.max(0, Math.round((heute - faellig) / 86400000))
}

export async function ladeOffenePosten() {
  const sb = getSupabaseClient()
  const { data } = await sb.from('offene_posten')
    .select('*, partner:geschaeftspartner(name,email,strasse,plz,ort)')
    .eq('typ', 'debitor').neq('status', 'ausgeglichen')
    .order('faelligkeitsdatum')
  return data || []
}

/**
 * Erhöht die Mahnstufe eines offenen Postens und protokolliert die
 * Mahnung. Gibt die neue Stufe + Text zurück (für Druck/E-Mail).
 */
export async function erstelleMahnung(op, userId, versandart = 'druck') {
  const sb = getSupabaseClient()
  const neueStufe = Math.min((op.mahnstufe || 0) + 1, 3)
  const heute = new Date().toISOString().slice(0, 10)

  const { error: opErr } = await sb.from('offene_posten')
    .update({ mahnstufe: neueStufe, letzte_mahnung_am: heute })
    .eq('id', op.id)
  if (opErr) return { ok: false, error: opErr.message }

  const { error: mahnErr } = await sb.from('mahnungen').insert({
    op_id: op.id, stufe: neueStufe, datum: heute, betrag: op.offen,
    versendet_an: op.partner?.email || null, versandart, erstellt_von: userId,
  })
  if (mahnErr) return { ok: false, error: mahnErr.message }

  return { ok: true, stufe: neueStufe }
}
