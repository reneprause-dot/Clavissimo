/**
 * Clavissimo – Optionslisten
 * Generischer Zugriff auf die editierbaren Stammdaten-Listen
 * (artikel_kategorien, sorten, medcang_kategorien, amg_kategorien,
 * gmp_klassen, temperaturklassen). Alle haben dieselbe Form:
 * { id, bezeichnung, aktiv, sortierung }.
 */
import { getSupabaseClient } from './supabase'

export async function ladeOptionen(tabelle) {
  const sb = getSupabaseClient()
  const { data, error } = await sb.from(tabelle).select('*').order('sortierung')
  if (error) { console.error(`ladeOptionen(${tabelle}):`, error.message); return [] }
  return data || []
}

export async function fuegeOptionHinzu(tabelle, bezeichnung) {
  if (!bezeichnung?.trim()) return { ok: false, error: 'Bezeichnung darf nicht leer sein.' }
  const sb = getSupabaseClient()
  const { error } = await sb.from(tabelle).insert({ bezeichnung: bezeichnung.trim() })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function setzeOptionAktiv(tabelle, id, aktiv) {
  const sb = getSupabaseClient()
  const { error } = await sb.from(tabelle).update({ aktiv }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Für Dropdowns: nur aktive Werte, alphabetisch/sortierung. */
export function nurAktive(liste) {
  return (liste || []).filter(o => o.aktiv)
}
