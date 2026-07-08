/**
 * Clavissimo – Chargen-Auswahl
 * Lädt für einen BtM-pflichtigen Artikel die verfügbaren, freigegebenen
 * Chargen — sortiert nach MHD aufsteigend (FEFO: First-Expired-First-Out,
 * Standard in der Pharma-Logistik, um Verfall zu vermeiden).
 */
import { getSupabaseClient } from './supabase'

export async function ladeVerfuegbareChargen(artikelId) {
  if (!artikelId) return []
  const sb = getSupabaseClient()
  const { data, error } = await sb.from('chargen')
    .select('id, chargennr, bestand, mhd, status')
    .eq('artikel_id', artikelId)
    .eq('status', 'freigegeben')
    .gt('bestand', 0)
    .order('mhd', { ascending: true, nullsFirst: false })
  if (error) { console.error('ladeVerfuegbareChargen:', error.message); return [] }
  return data || []
}
