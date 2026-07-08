/**
 * Clavissimo – BtM-Buch (§13 BtMVV)
 * Automatisches Führen des Zugangs-/Abgangsbuchs für BtM-pflichtige
 * Artikel, entsprechend CLAVISSIMO_SPEC.md ("BtM-Buch automatisch führen").
 *
 * Wird aufgerufen NACHDEM buchungslogik.js den eigentlichen Bestand
 * schon aktualisiert hat (Wareneingang bzw. Lieferschein) — diese Datei
 * greift nicht in die Kernbuchungslogik ein, sie protokolliert nur.
 */
import { getSupabaseClient } from './supabase'

/**
 * Bucht Zugang oder Abgang eines BtM-pflichtigen Artikels ins BtM-Buch.
 * Prüft selbst, ob der Artikel überhaupt btm_pflichtig ist — Aufrufer
 * müssen das nicht vorher filtern (kann aber, um Anfragen zu sparen).
 *
 * @param {object} p
 * @param {'zugang'|'abgang'} p.typ
 * @param {string} p.artikelId
 * @param {number} p.menge
 * @param {string} [p.chargeId] - optional, falls Chargen-Auswahl in der UI existiert
 * @param {string} [p.partnerId] - Lieferant (zugang) bzw. Kunde (abgang)
 * @param {string} [p.belegnr]
 * @param {string} [p.userId] - erp_users.id des Buchenden
 */
export async function bucheBtMBewegung({ typ, artikelId, menge, chargeId = null, partnerId = null, belegnr = null, userId = null }) {
  if (!artikelId || !menge) return { ok: false, error: 'artikelId und menge sind erforderlich.' }

  const sb = getSupabaseClient()

  const { data: artikel, error: artikelFehler } = await sb.from('artikel')
    .select('id, btm_pflichtig, bestand, einheit')
    .eq('id', artikelId).single()

  if (artikelFehler || !artikel) {
    return { ok: false, error: 'Artikel konnte für BtM-Buch nicht geladen werden.' }
  }
  if (!artikel.btm_pflichtig) {
    return { ok: true, gebucht: false } // kein BtM-Artikel — nichts zu tun, kein Fehler
  }

  // Falls eine konkrete Charge gewählt wurde: deren Bestand ebenfalls anpassen.
  if (chargeId) {
    const vorzeichen = typ === 'abgang' ? -1 : 1
    const { data: charge } = await sb.from('chargen').select('bestand').eq('id', chargeId).single()
    if (charge) {
      const neuerBestand = Math.max(0, (charge.bestand || 0) + vorzeichen * menge)
      await sb.from('chargen').update({ bestand: neuerBestand }).eq('id', chargeId)
    }
  }

  const { error } = await sb.from('btm_buch').insert({
    typ,
    datum: new Date().toISOString().slice(0, 10),
    charge_id: chargeId,
    artikel_id: artikelId,
    menge,
    einheit: artikel.einheit,
    partner_id: partnerId,
    belegnr,
    bestand_nach: artikel.bestand, // buchungslogik.js hat den Bestand vorher bereits aktualisiert
    gebucht_von: userId,
  })

  if (error) {
    console.error('BtM-Buch Fehler:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, gebucht: true }
}

/**
 * Bucht eine ganze Positionsliste (z.B. aus Verkauf.jsx/Einkauf.jsx nach
 * erfolgreichem Lieferschein/Wareneingang) in einem Rutsch. Positionen
 * ohne artikel_id oder menge werden übersprungen. Fehler einzelner
 * Positionen brechen die übrigen nicht ab, werden aber gesammelt.
 */
export async function bucheBtMBewegungenFuerPositionen(typ, positionen, { partnerId, belegnr, userId } = {}) {
  const fehler = []
  for (const pos of positionen || []) {
    const artikelId = pos.artikel_id
    const menge = parseFloat(pos.gelieferte_menge ?? pos.menge)
    if (!artikelId || !menge) continue
    const res = await bucheBtMBewegung({ typ, artikelId, menge, chargeId: pos.charge_id || null, partnerId, belegnr, userId })
    if (!res.ok) fehler.push(res.error)
  }
  return { ok: fehler.length === 0, fehler }
}
