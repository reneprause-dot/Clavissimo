/**
 * Clavissimo – Storno-Logik
 * Storniert einen Verkaufsbeleg NICHT durch Löschen (GoBD verbietet das),
 * sondern durch eine Gegenbuchung: neuer Beleg mit negierten Beträgen/
 * Mengen, referenziert per referenz_id auf das Original. Das Original
 * bleibt vollständig erhalten und wird nur als storniert markiert.
 *
 * WICHTIG — bewusste Grenze: Storniert wird nur die FINANZIELLE Seite
 * (Rechnung/Gutschrift). Eine bereits am Lieferschein gebuchte physische
 * Warenbewegung (Bestand, BtM-Buch) wird NICHT automatisch rückgängig
 * gemacht — das wäre eine Retoure, ein eigener Vorgang mit eigener
 * Wareneingangsprüfung, kein reiner Buchhaltungsstorno.
 */
import { getSupabaseClient } from './supabase'
import { logAudit } from './auditTrail'

export async function storniereVKBeleg(belegId, userId, grund) {
  if (!grund?.trim()) throw new Error('Stornogrund ist erforderlich.')
  const sb = getSupabaseClient()

  const { data: beleg, error: belegErr } = await sb.from('verkaufsbelege')
    .select('*, positionen:verkauf_positionen(*)').eq('id', belegId).single()
  if (belegErr || !beleg) throw new Error('Beleg konnte nicht geladen werden.')
  if (beleg.storniert) throw new Error('Dieser Beleg ist bereits storniert.')

  const stornoBelegnr = `ST-${beleg.belegnr}`

  // 1. Gegenbuchung anlegen (negierte Beträge)
  const { data: stornoBeleg, error: insertErr } = await sb.from('verkaufsbelege').insert({
    belegnr: stornoBelegnr,
    typ: 'gutschrift',
    kunde_id: beleg.kunde_id,
    datum: new Date().toISOString().slice(0, 10),
    referenz_id: beleg.id,
    referenz_belegnr: beleg.belegnr,
    nettobetrag: -(beleg.nettobetrag || 0),
    steuerbetrag: -(beleg.steuerbetrag || 0),
    bruttobetrag: -(beleg.bruttobetrag || 0),
    status: 'storniert',
    notizen: `Storno zu ${beleg.belegnr}: ${grund.trim()}`,
    erstellt_von: userId,
  }).select().single()
  if (insertErr) throw new Error(`Gegenbuchung fehlgeschlagen: ${insertErr.message}`)

  // 2. Positionen gespiegelt (negierte Menge) auf die Gegenbuchung übertragen
  const gespiegeltePositionen = (beleg.positionen || []).map(p => ({
    beleg_id: stornoBeleg.id,
    artikel_id: p.artikel_id,
    bezeichnung: p.bezeichnung,
    menge: -(p.menge || 0),
    einheit: p.einheit,
    einzelpreis: p.einzelpreis,
    mwst_satz: p.mwst_satz,
    nettobetrag: -(p.nettobetrag || (p.menge||0)*(p.einzelpreis||0)),
  }))
  if (gespiegeltePositionen.length > 0) {
    const { error: posErr } = await sb.from('verkauf_positionen').insert(gespiegeltePositionen)
    if (posErr) throw new Error(`Positionen der Gegenbuchung fehlgeschlagen: ${posErr.message}`)
  }

  // 3. Original als storniert markieren (kein Löschen!)
  const { error: updateErr } = await sb.from('verkaufsbelege').update({
    storniert: true,
    storno_belegnr: stornoBelegnr,
    storno_grund: grund.trim(),
    storniert_von: userId,
    storniert_am: new Date().toISOString(),
  }).eq('id', belegId)
  if (updateErr) throw new Error(`Original konnte nicht als storniert markiert werden: ${updateErr.message}`)

  // 4. Offenen Posten ausgleichen, falls vorhanden
  if (beleg.op_id) {
    await sb.from('offene_posten').update({ status: 'ausgeglichen', offen: 0 }).eq('id', beleg.op_id)
  }

  await logAudit('verkauf_storniert', { belegId, belegnr: beleg.belegnr, stornoBelegnr, grund: grund.trim(), userId })

  return stornoBeleg
}
