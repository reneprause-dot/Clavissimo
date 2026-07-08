import { getSupabaseClient } from './supabase'

/** Summe + Anzahl BtM-pflichtiger Artikel mit aktuellem Bestand. */
export async function ladeBtmBestand() {
  const sb = getSupabaseClient()
  const { data, error } = await sb.from('artikel')
    .select('id, bezeichnung, bestand, einheit')
    .eq('btm_pflichtig', true).eq('aktiv', true)
    .order('bestand', { ascending: false })
  if (error) return { gesamt: 0, artikel: [] }
  return {
    gesamt: (data || []).reduce((s, a) => s + (parseFloat(a.bestand) || 0), 0),
    artikel: data || [],
  }
}

/** Prüft, ob für den aktuellen Monat bereits eine BtM-Meldung existiert. */
export async function pruefeAktuelleMeldung() {
  const sb = getSupabaseClient()
  const monat = new Date().toISOString().slice(0, 7) // 'JJJJ-MM'
  const { data } = await sb.from('btm_meldungen').select('status').eq('monat', monat).maybeSingle()
  return { monat, vorhanden: Boolean(data), status: data?.status || null }
}
