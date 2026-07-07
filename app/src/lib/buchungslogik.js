/**
 * OpenERP Buchungslogik v2.0
 * Zentrale Buchungsfunktionen für alle Module
 * Implementiert vollständige Buchungsketten wie Business Central
 */
import { getSupabaseClient } from './supabase'
import { dbCall } from './dbHelper'
import { normDatum, normZeit, heute, faelligAm, jetzt } from './zeitHelfer'

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

export async function getKonto(nummer) {
  const sb = getSupabaseClient()
  const { data } = await dbCall(sb.from('konten').select('*').eq('nummer', nummer).single(), 'BL: konten')
  return data
}

export async function getKontenMap(nummern) {
  const sb = getSupabaseClient()
  const { data } = await dbCall(sb.from('konten').select('*').in('nummer', nummern), 'BL: konten')
  return Object.fromEntries((data || []).map(k => [k.nummer, k]))
}

export function nextBelegnr(prefix) {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `${prefix}-${y}${m}-${rand}`
}

export function faelligkeitsDatum(datum, zahlungsziel = 30) {
  const d = new Date(datum)
  d.setDate(d.getDate() + zahlungsziel)
  return d.toISOString().split('T')[0]
}

// ─── Kernbuchung ──────────────────────────────────────────────────────────────

export async function erstelleBuchung({ belegnr, datum, beschreibung, soll_nr, haben_nr, betrag, steuercode, steuerbetrag = 0, erstellt_von }) {
  const sb = getSupabaseClient()
  const konten = await getKontenMap([soll_nr, haben_nr])
  const sollKonto = konten[soll_nr]
  const habenKonto = konten[haben_nr]
  if (!sollKonto || !habenKonto) throw new Error(`Konto nicht gefunden: ${soll_nr} oder ${haben_nr}`)

  const { data: buchung, error } = await sb.from('buchungen').insert({
    belegnr, datum, beschreibung,
    soll_konto_id: sollKonto.id,
    haben_konto_id: habenKonto.id,
    betrag, steuercode, steuerbetrag, erstellt_von
  }).select().single()
  if (error) throw error

  // Salden aktualisieren
  await sb.from('konten').update({ saldo: (sollKonto.saldo || 0) + betrag }).eq('id', sollKonto.id)
  await sb.from('konten').update({ saldo: (habenKonto.saldo || 0) + betrag }).eq('id', habenKonto.id)

  return buchung
}

// ─── Artikelbewegung buchen ───────────────────────────────────────────────────

export async function bucheArtikelbewegung({ artikel_id, datum, typ, menge, einstandspreis = 0, referenz_typ, referenz_id, beschreibung }) {
  const sb = getSupabaseClient()
  const { data: art, error: artFehler } = await dbCall(sb.from('artikel').select('*').eq('id', artikel_id).single(), 'BL: artikel')
  if (artFehler) {
    console.error('bucheArtikelbewegung: Artikel konnte nicht geladen werden:', artFehler.message)
    return { error: artFehler }
  }
  if (!art) return { error: new Error(`Artikel ${artikel_id} nicht gefunden`) }

  const bestand_vorher = art.bestand || 0
  const delta = ['zugang','fertigung_zugang'].includes(typ) ? menge : -menge
  const bestand_nachher = bestand_vorher + delta
  const gesamtwert = menge * einstandspreis

  // Neuer Lagerwert (gleitender Durchschnitt bei Zugang)
  let neuer_wert = art.bestand_wert || 0
  if (['zugang','fertigung_zugang'].includes(typ)) {
    neuer_wert = (art.bestand_wert || 0) + gesamtwert
  } else {
    // Abgang: anteiligen Wert abziehen
    const avg = bestand_vorher > 0 ? (art.bestand_wert || 0) / bestand_vorher : 0
    neuer_wert = Math.max(0, (art.bestand_wert || 0) - (Math.abs(delta) * avg))
  }

  const { error: bewegungFehler } = await sb.from('artikelbewegungen').insert({
    artikel_id, datum, typ, menge: Math.abs(menge),
    einstandspreis, gesamtwert,
    bestand_vorher, bestand_nachher,
    referenz_typ, referenz_id, beschreibung
  })
  if (bewegungFehler) {
    console.error('bucheArtikelbewegung: Bewegung konnte nicht gespeichert werden:', bewegungFehler.message)
    return { error: bewegungFehler }
  }

  const { error: updateFehler } = await sb.from('artikel').update({
    bestand: bestand_nachher,
    bestand_wert: neuer_wert
  }).eq('id', artikel_id)
  if (updateFehler) {
    // Die Bewegung wurde bereits gespeichert, der Artikelbestand konnte
    // aber nicht aktualisiert werden - das ist eine Inkonsistenz, die
    // sichtbar gemeldet werden muss, nicht nur ein technischer Fehler.
    console.error('bucheArtikelbewegung: KRITISCH - Bewegung gespeichert, aber Artikelbestand nicht aktualisiert:', updateFehler.message)
    return { error: new Error(`Bewegung wurde dokumentiert, Bestand konnte aber nicht aktualisiert werden: ${updateFehler.message}. Bitte Artikel ${artikel_id} manuell prüfen.`) }
  }

  return { bestand_vorher, bestand_nachher, error: null }
}

// ─── Offener Posten ───────────────────────────────────────────────────────────

export async function erstelleOffenenPosten({ typ, partner_id, beleg_id, beleg_typ, belegnr, datum, faelligkeitsdatum, betrag, buchungs_id }) {
  const sb = getSupabaseClient()
  const { data: op } = await sb.from('offene_posten').insert({
    typ, partner_id, beleg_id, beleg_typ, belegnr, datum, faelligkeitsdatum, betrag, offen: betrag, buchungs_id, status: 'offen'
  }).select().single()

  // Partner-OP-Saldo aktualisieren
  // Debitor: Forderung steigt (positiv), Kreditor: Verbindlichkeit steigt (negativ)
  const { data: partnerOP } = await dbCall(sb.from('geschaeftspartner').select('op_saldo').eq('id', partner_id).single(), 'BL: geschaeftspartner')
  const delta = typ === 'debitor' ? betrag : -betrag
  await sb.from('geschaeftspartner').update({ op_saldo: (partnerOP?.op_saldo || 0) + delta }).eq('id', partner_id)

  return op
}

// ─── EINKAUF: Vollständige Buchungskette ──────────────────────────────────────

/**
 * SCHRITT 1: Bestellung anlegen (keine Buchung, nur Beleg)
 */
export async function einkaufBestellungAnlegen({ lieferant_id, datum, positionen, notizen, erstellt_von }) {
  const sb = getSupabaseClient()
  const belegnr = nextBelegnr('EK-BEST')
  const { netto, steuer, brutto } = berechnePositionen(positionen)

  const { data: beleg } = await sb.from('einkaufsbelege').insert({
    belegnr, typ: 'bestellung', lieferant_id, datum,
    nettobetrag: netto, steuerbetrag: steuer, bruttobetrag: brutto,
    status: 'offen', notizen, erstellt_von
  }).select().single()

  const { error: posError } = await sb.from('einkauf_positionen').insert(positionen.map(p => ({
    beleg_id: beleg.id, ...mapPosition(p)
  })))
  if (posError) {
    console.error('einkaufBestellungAnlegen: Positionen-Insert fehlgeschlagen:', posError.message)
    throw new Error(`Bestellung angelegt, aber Positionen fehlgeschlagen: ${posError.message}`)
  }

  return beleg
}

/**
 * SCHRITT 2: Wareneingang buchen (verknüpft mit Bestellung)
 *  → Bestand erhöht sich
 *  → Artikelbewegung wird geschrieben
 *  → Lagerwert-Buchung: Soll 3000 Warenbestand / Haben 1600 Verbindlichkeiten (vorläufig)
 *  → Bestellung → Status "geliefert" (oder "teilweise_geliefert")
 */
export async function einkaufWareneingangBuchen({ bestellung_id, lieferdatum, lieferscheinnr, positionen_geliefert, erstellt_von }) {
  const sb = getSupabaseClient()

  // Bestellung laden
  const { data: bestellung } = await sb.from('einkaufsbelege')
    .select('*, positionen:einkauf_positionen(*), lieferant:geschaeftspartner(*)')
    .eq('id', bestellung_id).single()
  if (!bestellung) throw new Error('Bestellung nicht gefunden')

  const belegnr = nextBelegnr('EK-WE')
  const { netto, steuer, brutto } = berechnePositionen(positionen_geliefert)

  // Wareneingangsbeleg anlegen (verknüpft mit Bestellung)
  const { data: we } = await sb.from('einkaufsbelege').insert({
    belegnr, typ: 'wareneingang',
    lieferant_id: bestellung.lieferant_id,
    referenz_id: bestellung_id,
    referenz_belegnr: bestellung.belegnr,
    datum: lieferdatum, lieferdatum,
    lieferscheinnr,
    nettobetrag: netto, steuerbetrag: steuer, bruttobetrag: brutto,
    status: 'geliefert', erstellt_von, gebucht_am: jetzt()
  }).select().single()

  const { error: posError } = await sb.from('einkauf_positionen').insert(positionen_geliefert.map(p => ({
    beleg_id: we.id, ...mapPosition(p), menge_geliefert: p.menge
  })))
  if (posError) {
    console.error('einkaufWareneingangBuchen: Positionen-Insert fehlgeschlagen:', posError.message)
    throw new Error(`Wareneingang angelegt, aber Positionen fehlgeschlagen: ${posError.message}`)
  }

  // Für jede Position: Bestand erhöhen + Artikelbewegung
  for (const pos of positionen_geliefert) {
    if (!pos.artikel_id) continue
    await bucheArtikelbewegung({
      artikel_id: pos.artikel_id,
      datum: lieferdatum,
      typ: 'zugang',
      menge: pos.menge,
      einstandspreis: pos.einzelpreis,
      referenz_typ: 'einkauf',
      referenz_id: we.id,
      beschreibung: `Wareneingang ${belegnr}`
    })
  }

  // Bestellung-Status aktualisieren
  // Prüfe ob alle Positionen vollständig geliefert
  const alleGeliefert = bestellung.positionen?.every(bp => {
    const geliefert = positionen_geliefert.find(p => p.original_position_id === bp.id || p.artikel_id === bp.artikel_id)
    return geliefert && geliefert.menge >= bp.menge
  })
  await sb.from('einkaufsbelege').update({
    status: alleGeliefert ? 'geliefert' : 'teilweise_geliefert',
    lieferdatum, lieferscheinnr
  }).eq('id', bestellung_id)

  return we
}

/**
 * SCHRITT 3: Eingangsrechnung buchen (verknüpft mit Wareneingang oder Bestellung)
 *  → Buchung: Soll 5000 Wareneinkauf + 1570 Vorsteuer / Haben 1600 Verbindlichkeiten
 *  → Offener Posten auf Kreditorenkonto
 *  → Bestellung → Status "berechnet" → geht ins Archiv
 */
export async function einkaufRechnungBuchen({ referenz_id, referenz_typ = 'wareneingang', lieferantenrechnungsnr, datum, faelligkeitsdatum, positionen, notizen, erstellt_von }) {
  const sb = getSupabaseClient()

  // Referenzbeleg laden
  const { data: referenz } = await sb.from('einkaufsbelege')
    .select('*, lieferant:geschaeftspartner(*)')
    .eq('id', referenz_id).single()
  if (!referenz) throw new Error('Referenzbeleg nicht gefunden')

  const belegnr = nextBelegnr('EK-RE')
  const { netto, steuer, brutto } = berechnePositionen(positionen)
  const mwst19 = positionen.filter(p => p.mwst_satz >= 19).reduce((s, p) => s + (p.menge * p.einzelpreis * 0.19), 0)
  const mwst7 = positionen.filter(p => p.mwst_satz === 7).reduce((s, p) => s + (p.menge * p.einzelpreis * 0.07), 0)
  const netto19 = positionen.filter(p => p.mwst_satz >= 19).reduce((s, p) => s + (p.menge * p.einzelpreis), 0)
  const netto7 = positionen.filter(p => p.mwst_satz === 7).reduce((s, p) => s + (p.menge * p.einzelpreis), 0)

  const fkDatum = faelligkeitsdatum || faelligkeitsDatum(datum, referenz.lieferant?.zahlungsziel || 30)
  const zahlungsziel = referenz.lieferant?.zahlungsziel || 30

  // Buchungen anlegen
  let buchung1 = null, buchung2 = null

  // Hauptbuchung: Wareneinkauf / Verbindlichkeiten (Brutto auf Verbindlichkeiten)
  if (netto19 > 0) {
    buchung1 = await erstelleBuchung({
      belegnr,
      datum,
      beschreibung: `Eingangsrechnung ${lieferantenrechnungsnr || belegnr} – ${referenz.lieferant?.name}`,
      soll_nr: '5000',   // Wareneinkauf 19%
      haben_nr: '1600',  // Verbindlichkeiten L+L
      betrag: netto19,
      steuercode: 'VSt19',
      steuerbetrag: mwst19,
      erstellt_von
    })
    // Vorsteuer
    if (mwst19 > 0) {
      await erstelleBuchung({
        belegnr: belegnr + '-VST',
        datum,
        beschreibung: `Vorsteuer 19% zu ${belegnr}`,
        soll_nr: '1570',  // Vorsteuer 19%
        haben_nr: '1600', // Verbindlichkeiten
        betrag: mwst19,
        steuercode: 'VSt19',
        erstellt_von
      })
    }
  }

  if (netto7 > 0) {
    await erstelleBuchung({
      belegnr: belegnr + '-7',
      datum,
      beschreibung: `Eingangsrechnung 7% ${belegnr}`,
      soll_nr: '5300',
      haben_nr: '1600',
      betrag: netto7,
      steuercode: 'VSt7',
      steuerbetrag: mwst7,
      erstellt_von
    })
    if (mwst7 > 0) {
      await erstelleBuchung({
        belegnr: belegnr + '-VST7',
        datum,
        beschreibung: `Vorsteuer 7% zu ${belegnr}`,
        soll_nr: '1571',
        haben_nr: '1600',
        betrag: mwst7,
        erstellt_von
      })
    }
  }

  // Rechnungsbeleg anlegen
  const { data: rechnung } = await sb.from('einkaufsbelege').insert({
    belegnr, typ: 'rechnung',
    lieferant_id: referenz.lieferant_id,
    referenz_id, referenz_belegnr: referenz.belegnr,
    datum, faelligkeitsdatum: fkDatum,
    lieferantenrechnungsnr,
    nettobetrag: netto, steuerbetrag: steuer, bruttobetrag: brutto,
    status: 'berechnet',
    buchungs_id: buchung1?.id,
    notizen, erstellt_von, gebucht_am: jetzt()
  }).select().single()

  const { error: posError } = await sb.from('einkauf_positionen').insert(positionen.map(p => ({
    beleg_id: rechnung.id, ...mapPosition(p), menge_berechnet: p.menge
  })))
  if (posError) {
    console.error('einkaufRechnungBuchen: Positionen-Insert fehlgeschlagen:', posError.message)
    throw new Error(`Eingangsrechnung angelegt, aber Positionen fehlgeschlagen: ${posError.message}`)
  }

  // Offenen Posten anlegen (Kreditor)
  const op = await erstelleOffenenPosten({
    typ: 'kreditor',
    partner_id: referenz.lieferant_id,
    beleg_id: rechnung.id,
    beleg_typ: 'einkauf',
    belegnr,
    datum,
    faelligkeitsdatum: fkDatum,
    betrag: brutto,
    buchungs_id: buchung1?.id
  })

  // Rechnung mit OP verknüpfen
  await sb.from('einkaufsbelege').update({ op_id: op.id }).eq('id', rechnung.id)

  // Referenzbeleg (Wareneingang/Bestellung) → Status "berechnet" (= archiviert)
  await sb.from('einkaufsbelege').update({ status: 'berechnet' }).eq('id', referenz_id)

  // Falls Referenz ein Wareneingang ist → auch die zugehörige Bestellung archivieren
  if (referenz.typ === 'wareneingang' && referenz.referenz_id) {
    await sb.from('einkaufsbelege').update({ status: 'archiviert' }).eq('id', referenz.referenz_id)
  }

  return { rechnung, op }
}

// ─── VERKAUF: Vollständige Buchungskette ──────────────────────────────────────

export async function verkaufAngebotAnlegen({ kunde_id, datum, positionen, notizen, erstellt_von }) {
  const sb = getSupabaseClient()
  const belegnr = nextBelegnr('VK-ANG')
  const { netto, steuer, brutto } = berechnePositionen(positionen)

  const { data: beleg } = await sb.from('verkaufsbelege').insert({
    belegnr, typ: 'angebot', kunde_id, datum,
    nettobetrag: netto, steuerbetrag: steuer, bruttobetrag: brutto,
    status: 'offen', notizen, erstellt_von
  }).select().single()

  const { error: posError } = await sb.from('verkauf_positionen').insert(positionen.map(p => ({
    beleg_id: beleg.id, ...mapPosition(p)
  })))
  if (posError) {
    console.error('verkaufAngebotAnlegen: Positionen-Insert fehlgeschlagen:', posError.message)
    throw new Error(`Angebot angelegt, aber Positionen fehlgeschlagen: ${posError.message}`)
  }

  return beleg
}

export async function verkaufAuftragAnlegen({ kunde_id, datum, positionen, notizen, erstellt_von, angebot_id }) {
  const sb = getSupabaseClient()
  const belegnr = nextBelegnr('VK-AUF')
  const { netto, steuer, brutto } = berechnePositionen(positionen)

  const referenz = angebot_id ? await dbCall(sb.from('verkaufsbelege').select('belegnr').eq('id', angebot_id).single(), 'BL: verkaufsbelege') : null

  const { data: beleg } = await sb.from('verkaufsbelege').insert({
    belegnr, typ: 'auftrag', kunde_id, datum,
    referenz_id: angebot_id || null,
    referenz_belegnr: referenz?.data?.belegnr || null,
    nettobetrag: netto, steuerbetrag: steuer, bruttobetrag: brutto,
    status: 'offen', notizen, erstellt_von
  }).select().single()

  const { error: posError } = await sb.from('verkauf_positionen').insert(positionen.map(p => ({
    beleg_id: beleg.id, ...mapPosition(p)
  })))
  if (posError) {
    console.error('verkaufAuftragAnlegen: Positionen-Insert fehlgeschlagen:', posError.message)
    throw new Error(`Auftrag ${belegnr} angelegt, aber Positionen fehlgeschlagen: ${posError.message}`)
  }

  if (angebot_id) await sb.from('verkaufsbelege').update({ status: 'archiviert' }).eq('id', angebot_id)
  return beleg
}

export async function verkaufLieferscheinBuchen({ auftrag_id, lieferdatum, positionen_geliefert, erstellt_von }) {
  const sb = getSupabaseClient()
  const { data: auftrag } = await sb.from('verkaufsbelege')
    .select('*, positionen:verkauf_positionen(*), kunde:geschaeftspartner(*)')
    .eq('id', auftrag_id).single()

  const belegnr = nextBelegnr('VK-LS')
  const { netto, steuer, brutto } = berechnePositionen(positionen_geliefert)

  const { data: ls } = await sb.from('verkaufsbelege').insert({
    belegnr, typ: 'lieferschein',
    kunde_id: auftrag.kunde_id,
    referenz_id: auftrag_id,
    referenz_belegnr: auftrag.belegnr,
    datum: lieferdatum, lieferdatum,
    nettobetrag: netto, steuerbetrag: steuer, bruttobetrag: brutto,
    status: 'geliefert', erstellt_von, gebucht_am: jetzt()
  }).select().single()

  const { error: posError } = await sb.from('verkauf_positionen').insert(positionen_geliefert.map(p => ({
    beleg_id: ls.id, ...mapPosition(p), menge_geliefert: p.menge
  })))
  if (posError) {
    console.error('verkaufLieferscheinBuchen: Positionen-Insert fehlgeschlagen:', posError.message)
    throw new Error(`Lieferschein ${belegnr} angelegt, aber Positionen fehlgeschlagen: ${posError.message}`)
  }

  // Bestand reduzieren
  for (const pos of positionen_geliefert) {
    if (!pos.artikel_id) continue
    await bucheArtikelbewegung({
      artikel_id: pos.artikel_id,
      datum: lieferdatum,
      typ: 'abgang',
      menge: pos.menge,
      referenz_typ: 'verkauf',
      referenz_id: ls.id,
      beschreibung: `Lieferschein ${belegnr}`
    })
  }

  const alleGeliefert = auftrag.positionen?.every(ap => {
    const gel = positionen_geliefert.find(p => p.artikel_id === ap.artikel_id)
    return gel && gel.menge >= ap.menge
  })
  await sb.from('verkaufsbelege').update({
    status: alleGeliefert ? 'geliefert' : 'teilweise_geliefert'
  }).eq('id', auftrag_id)

  return ls
}

export async function verkaufRechnungBuchen({ referenz_id, datum, positionen, notizen, erstellt_von }) {
  const sb = getSupabaseClient()
  const { data: referenz } = await sb.from('verkaufsbelege')
    .select('*, kunde:geschaeftspartner(*)')
    .eq('id', referenz_id).single()

  const belegnr = nextBelegnr('VK-RE')
  const { netto, steuer, brutto } = berechnePositionen(positionen)
  const mwst19 = positionen.filter(p => p.mwst_satz >= 19).reduce((s, p) => s + (p.menge * p.einzelpreis * 0.19), 0)
  const netto19 = positionen.filter(p => p.mwst_satz >= 19).reduce((s, p) => s + (p.menge * p.einzelpreis), 0)

  const fkDatum = faelligkeitsDatum(datum, referenz.kunde?.zahlungsziel || 30)

  // Buchung: Forderungen / Umsatzerlöse
  const buchung = await erstelleBuchung({
    belegnr, datum,
    beschreibung: `Ausgangsrechnung ${belegnr} – ${referenz.kunde?.name}`,
    soll_nr: '1400',  // Forderungen L+L
    haben_nr: '4000', // Umsatzerlöse 19%
    betrag: netto19 || netto,
    steuercode: 'USt19',
    steuerbetrag: mwst19,
    erstellt_von
  })

  // Umsatzsteuer-Buchung
  if (mwst19 > 0) {
    await erstelleBuchung({
      belegnr: belegnr + '-UST',
      datum,
      beschreibung: `Umsatzsteuer 19% zu ${belegnr}`,
      soll_nr: '1400',  // Forderungen L+L (Brutto-Anteil)
      haben_nr: '1776', // Umsatzsteuer 19% (Verbindlichkeit gegenüber FA)
      betrag: mwst19,
      erstellt_von
    })
  }

  const { data: rechnung } = await sb.from('verkaufsbelege').insert({
    belegnr, typ: 'rechnung',
    kunde_id: referenz.kunde_id,
    referenz_id, referenz_belegnr: referenz.belegnr,
    datum, faelligkeitsdatum: fkDatum,
    nettobetrag: netto, steuerbetrag: steuer, bruttobetrag: brutto,
    status: 'berechnet',
    buchungs_id: buchung.id,
    notizen, erstellt_von, gebucht_am: jetzt()
  }).select().single()

  const { error: posError } = await sb.from('verkauf_positionen').insert(positionen.map(p => ({
    beleg_id: rechnung.id, ...mapPosition(p)
  })))
  if (posError) {
    console.error('verkaufRechnungBuchen: Positionen-Insert fehlgeschlagen:', posError.message)
    throw new Error(`Rechnung angelegt, aber Positionen fehlgeschlagen: ${posError.message}`)
  }

  const op = await erstelleOffenenPosten({
    typ: 'debitor',
    partner_id: referenz.kunde_id,
    beleg_id: rechnung.id,
    beleg_typ: 'verkauf',
    belegnr,
    datum,
    faelligkeitsdatum: fkDatum,
    betrag: brutto,
    buchungs_id: buchung.id
  })

  await sb.from('verkaufsbelege').update({ op_id: op.id }).eq('id', rechnung.id)
  await sb.from('verkaufsbelege').update({ status: 'archiviert' }).eq('id', referenz_id)

  return { rechnung, op }
}

// ─── ZAHLUNG: Offene Posten ausgleichen ──────────────────────────────────────

export async function zahlungBuchen({ datum, partner_id, zahlungsart, betrag, verwendungszweck, op_ids, erstellt_von }) {
  const sb = getSupabaseClient()

  const { data: partner } = await dbCall(sb.from('geschaeftspartner').select('*').eq('id', partner_id).single(), 'BL: geschaeftspartner')
  let istKreditor = false
  if (op_ids.length > 0) {
    const { data: opTyp } = await dbCall(sb.from('offene_posten').select('typ').eq('id', op_ids[0]).single(), 'BL: offene_posten')
    istKreditor = opTyp?.typ === 'kreditor'
  }

  const konto_bank_kasse = zahlungsart === 'kasse' ? '1000' : '1200'

  // Buchung: Bank/Kasse / Verbindlichkeiten (Zahlung an Lieferant)
  // oder: Bank/Kasse / Forderungen (Eingang vom Kunden) – eigentlich andersrum
  let soll_nr, haben_nr, beschreibung
  if (istKreditor) {
    // Lieferant bezahlen: Soll 1600 Verbindlichkeiten / Haben 1200 Bank
    soll_nr = '1600'
    haben_nr = konto_bank_kasse
    beschreibung = `Zahlung an ${partner?.name || 'Lieferant'} – ${verwendungszweck || ''}`
  } else {
    // Kundenzahlung empfangen: Soll 1200 Bank / Haben 1400 Forderungen
    soll_nr = konto_bank_kasse
    haben_nr = '1400'
    beschreibung = `Zahlungseingang ${partner?.name || 'Kunde'} – ${verwendungszweck || ''}`
  }

  const belegnr = nextBelegnr('ZA')
  const buchung = await erstelleBuchung({ belegnr, datum, beschreibung, soll_nr, haben_nr, betrag, erstellt_von })

  // Zahlung speichern
  const { data: zahlung } = await sb.from('zahlungen').insert({
    datum, partner_id, zahlungsart, betrag, verwendungszweck, buchungs_id: buchung.id
  }).select().single()

  // Offene Posten ausgleichen
  let restBetrag = betrag
  for (const op_id of op_ids) {
    if (restBetrag <= 0) break
    const { data: op } = await dbCall(sb.from('offene_posten').select('*').eq('id', op_id).single(), 'BL: offene_posten')
    if (!op || op.status === 'ausgeglichen') continue

    const ausgleichBetrag = Math.min(restBetrag, op.offen)
    restBetrag -= ausgleichBetrag
    const neuesOffen = op.offen - ausgleichBetrag
    const neuerStatus = neuesOffen <= 0.01 ? 'ausgeglichen' : 'teilbezahlt'

    await sb.from('offene_posten').update({ offen: neuesOffen, status: neuerStatus }).eq('id', op_id)
    await sb.from('zahlung_op_zuordnung').insert({ zahlung_id: zahlung.id, op_id, betrag: ausgleichBetrag })

    // Beleg als bezahlt markieren
    if (neuerStatus === 'ausgeglichen') {
      if (op.beleg_typ === 'einkauf') {
        await sb.from('einkaufsbelege').update({ status: 'bezahlt' }).eq('id', op.beleg_id)
      } else if (op.beleg_typ === 'verkauf') {
        await sb.from('verkaufsbelege').update({ status: 'bezahlt' }).eq('id', op.beleg_id)
      }
    }
  }

  // Partner-OP-Saldo aktualisieren
  await sb.from('geschaeftspartner').update({ op_saldo: Math.max(0, (partner?.op_saldo || 0) - betrag) }).eq('id', partner_id)

  return zahlung
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

export function berechnePositionen(positionen) {
  const netto = positionen.reduce((s, p) => s + ((p.menge || 0) * (p.einzelpreis || 0)), 0)
  const steuer = positionen.reduce((s, p) => s + ((p.menge || 0) * (p.einzelpreis || 0) * ((p.mwst_satz || 0) / 100)), 0)
  return { netto, steuer, brutto: netto + steuer }
}

function mapPosition(p) {
  return {
    artikel_id: p.artikel_id || null,
    bezeichnung: p.bezeichnung,
    menge: parseFloat(p.menge) || 1,
    einheit: p.einheit || 'Stk',
    einzelpreis: parseFloat(p.einzelpreis) || 0,
    mwst_satz: parseFloat(p.mwst_satz) || 19,
    nettobetrag: (parseFloat(p.menge) || 1) * (parseFloat(p.einzelpreis) || 0)
  }
}

// ─── GoBD: Unveränderlichkeit ─────────────────────────────────────────────────

/**
 * Integritäts-Hash für eine Buchung (deterministisch)
 * Verhindert nachträgliche Manipulation ohne Protokolleintrag
 */
export async function erstelleHash(buchung) {
  const str = [buchung.belegnr, buchung.datum, buchung.betrag,
    buchung.soll_konto_id, buchung.haben_konto_id, buchung.beschreibung
  ].join('|')
  // Web Crypto API (im Browser verfügbar)
  const msgBuf = new TextEncoder().encode(str)
  const hashBuf = await crypto.subtle.digest('SHA-256', msgBuf)
  const hashArr = Array.from(new Uint8Array(hashBuf))
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Buchung festschreiben (GoBD §14a)
 * Nach Festschreibung: keine Änderung mehr möglich, nur Storno
 */
export async function buchungFestschreiben(buchungId, userId) {
  const sb = getSupabaseClient()
  const { data: b, error } = await dbCall(sb.from('buchungen').select('*').eq('id', buchungId).single(), 'BL: buchungen')
  if (error || !b) throw new Error('Buchung nicht gefunden')
  if (b.festgeschrieben) throw new Error('Buchung ist bereits festgeschrieben')

  const hash = await erstelleHash(b)
  await sb.from('buchungen').update({
    festgeschrieben: true,
    festgeschrieben_am: jetzt(),
    festgeschrieben_von: userId,
    integritaets_hash: hash,
  }).eq('id', buchungId)

  await sb.from('gobd_protokoll').insert({
    buchung_id: buchungId,
    aktion: 'festgeschrieben',
    ausgefuehrt_von: userId,
    details: `Hash: ${hash.slice(0, 16)}...`
  })
  return hash
}

/**
 * Periode festschreiben (alle Buchungen eines Monats)
 */
export async function periodeFestschreiben(periode, userId) {
  const sb = getSupabaseClient()
  const [jahr, monat] = periode.split('-').map(Number)
  const vonDatum = `${jahr}-${String(monat).padStart(2,'0')}-01`
  const bisDatum = normDatum(jahr, monat, 0)

  const { data: buchungen } = await sb.from('buchungen')
    .select('id').eq('festgeschrieben', false)
    .gte('datum', vonDatum).lte('datum', bisDatum)

  if (!buchungen?.length) return { anzahl: 0 }

  let hashes = []
  for (const b of buchungen) {
    const hash = await buchungFestschreiben(b.id, userId)
    hashes.push(hash)
  }

  // Gesamt-Hash aus allen Einzel-Hashes
  const gesamtStr = hashes.join('')
  const msgBuf = new TextEncoder().encode(gesamtStr)
  const hashBuf = await crypto.subtle.digest('SHA-256', msgBuf)
  const hashGesamt = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

  await sb.from('gobd_perioden').upsert({
    periode,
    typ: 'monat',
    festgeschrieben: true,
    festgeschrieben_am: jetzt(),
    festgeschrieben_von: userId,
    anzahl_buchungen: buchungen.length,
    hash_gesamt: hashGesamt,
  }, { onConflict: 'periode' })

  return { anzahl: buchungen.length, hash: hashGesamt }
}

/**
 * Änderungsversuch protokollieren
 */
export async function protokolliereAenderungsversuch(buchungId, userId, details) {
  const sb = getSupabaseClient()
  await sb.from('gobd_protokoll').insert({
    buchung_id: buchungId,
    aktion: 'aenderungsversuch',
    ausgefuehrt_von: userId,
    details
  })
}

// ─── GoBD-gesicherte erstelleBuchung ────────────────────────────────────────

/**
 * Erweiterte erstelleBuchung mit automatischem Hash
 * Ersetzt die bisherige erstelleBuchung – API-kompatibel
 */
const _erstelleBuchungOriginal = erstelleBuchung
export { _erstelleBuchungOriginal as erstelleBuchungOhneHash }

// ─── FERTIGUNG ────────────────────────────────────────────────────────────────

/**
 * Material reservieren fuer Fertigungsauftrag
 * Sperrt Bestand ohne ihn sofort abzuziehen
 */
export async function materialReservieren({ auftrag_id, positionen, erstellt_von }) {
  const sb = getSupabaseClient()
  for (const pos of positionen) {
    if (!pos.artikel_id) continue
    await sb.from('material_reservierungen').upsert({
      auftrag_id,
      artikel_id:   pos.artikel_id,
      menge:        pos.menge,
      erstellt_von,
    }, { onConflict: 'auftrag_id,artikel_id' })
  }
}

/**
 * Fertigungsauftrag abschliessen mit vollstaendiger Buchungskette:
 * - Materialabgang buchen (Artikelbewegungen + Buchungssatz)
 * - Fertigprodukt-Zugang buchen
 * - Fertigungskosten auf Kostenstelle buchen
 * - Reservierungen aufloesen
 */
export async function fertigungsauftragAbschliessen({
  auftrag_id, artikel_id, menge, stueckliste,
  kostenstelle, lohnkosten = 0, gemeinkosten = 0, erstellt_von
}) {
  const sb = getSupabaseClient()
  const datum = heute()
  const belegnr = nextBelegnr('FA-AB')

  // 1. Materialabgang je Komponente
  let gesamtMaterialkosten = 0
  for (const komp of stueckliste) {
    const abzug = komp.menge * menge
    const { data: art } = await sb.from('artikel')
      .select('bestand,einstandspreis').eq('id', komp.komponente_id).single()
    if (!art) continue

    const neuerBestand = Math.max(0, (art.bestand || 0) - abzug)
    const materialwert  = abzug * (art.einstandspreis || 0)
    gesamtMaterialkosten += materialwert

    // Bestand aktualisieren
    await sb.from('artikel').update({ bestand: neuerBestand }).eq('id', komp.komponente_id)

    // Artikelbewegung
    await bucheArtikelbewegung({
      artikel_id:   komp.komponente_id,
      datum,
      typ:          'abgang',
      menge:        abzug,
      einstandspreis: art.einstandspreis || 0,
      referenz_typ: 'fertigungsauftrag',
      referenz_id:  auftrag_id,
      beschreibung: `Materialabgang FA ${belegnr}`,
    })

    // Buchungssatz: Materialverbrauch
    if (materialwert > 0) {
      await erstelleBuchung({
        belegnr,
        datum,
        beschreibung: `Materialverbrauch FA ${belegnr}: ${komp.bezeichnung || komp.komponente_id}`,
        soll_nr:  '3200',  // Rohstoffe
        haben_nr: '1530',  // Fertige/Halbfertige Erzeugnisse
        betrag:   materialwert,
        erstellt_von,
      })
    }
  }

  // 2. Fertigprodukt-Zugang buchen
  const gesamtkosten = gesamtMaterialkosten + lohnkosten + gemeinkosten
  const herstellkosten = menge > 0 ? gesamtkosten / menge : 0

  const { data: fertigArt } = await sb.from('artikel')
    .select('bestand,einstandspreis').eq('id', artikel_id).single()
  if (fertigArt) {
    await sb.from('artikel').update({
      bestand: (fertigArt.bestand || 0) + menge,
      einstandspreis: herstellkosten > 0 ? herstellkosten : fertigArt.einstandspreis,
    }).eq('id', artikel_id)

    await bucheArtikelbewegung({
      artikel_id,
      datum,
      typ:           'zugang',
      menge,
      einstandspreis: herstellkosten,
      referenz_typ:  'fertigungsauftrag',
      referenz_id:   auftrag_id,
      beschreibung:  `Fertigprodukt-Zugang FA ${belegnr}`,
    })
  }

  // 3. Fertigungskosten Buchung
  if (gesamtkosten > 0) {
    await erstelleBuchung({
      belegnr,
      datum,
      beschreibung: `Fertigungskosten FA ${belegnr}`,
      soll_nr:  '1520',  // Unfertige Erzeugnisse -> Fertige
      haben_nr: '7600',  // Bestandsveraenderungen
      betrag:   gesamtkosten,
      erstellt_von,
    })
  }

  // 4. Lohnkosten buchen
  if (lohnkosten > 0) {
    await erstelleBuchung({
      belegnr,
      datum,
      beschreibung: `Lohnkosten FA ${belegnr}`,
      soll_nr:  '4000',  // Loehne
      haben_nr: '2910',  // Verb. Lohn/Gehalt
      betrag:   lohnkosten,
      erstellt_von,
    })
  }

  // 5. Reservierungen aufloesen
  await sb.from('material_reservierungen')
    .delete().eq('auftrag_id', auftrag_id)

  // 6. Auftrag abschliessen
  await sb.from('fertigungsauftraege').update({
    status:           'abgeschlossen',
    abgeschlossen_am: jetzt(),
    herstellkosten:   herstellkosten,
    gesamtkosten:     gesamtkosten,
  }).eq('id', auftrag_id)

  return { belegnr, gesamtkosten, herstellkosten }
}

// ─── HOLZ & STAHL ─────────────────────────────────────────────────────────────

/**
 * Zuschnitt buchen: Stammlaenge wird reduziert, Reststuecke erzeugt
 */
export async function zuschnittBuchen({
  stamm_id, artikel_id, zugeschnitten_menge, verschnitt_menge,
  auftrag_id, erstellt_von
}) {
  const sb = getSupabaseClient()
  const datum = heute()
  const belegnr = nextBelegnr('ZS')

  // Stamm-Bestand reduzieren
  const { data: stamm } = await sb.from('holzstahl_staemme')
    .select('bestand_stueck,laenge,artikel_id').eq('id', stamm_id).single()
  if (!stamm) throw new Error('Stamm nicht gefunden')

  const neuerBestand = Math.max(0, (stamm.bestand_stueck || 0) - 1)
  await sb.from('holzstahl_staemme')
    .update({ bestand_stueck: neuerBestand }).eq('id', stamm_id)

  // Artikelbewegung Abgang
  await bucheArtikelbewegung({
    artikel_id:   stamm.artikel_id || artikel_id,
    datum,
    typ:          'abgang',
    menge:        1,
    referenz_typ: 'zuschnitt',
    referenz_id:  stamm_id,
    beschreibung: `Zuschnitt ${belegnr}: ${stamm.laenge}mm`,
  })

  // Verschnitt als Kostenfaktor
  if (verschnitt_menge > 0) {
    const { data: art } = await sb.from('artikel')
      .select('einstandspreis').eq('id', artikel_id).single()
    const verschnittWert = verschnitt_menge * (art?.einstandspreis || 0) / (stamm.laenge || 1)
    if (verschnittWert > 0) {
      await erstelleBuchung({
        belegnr,
        datum,
        beschreibung: `Verschnittkosten ${belegnr}: ${verschnitt_menge}mm`,
        soll_nr:  '6600',  // Sonstige betriebliche Aufwendungen
        haben_nr: '3200',  // Rohstoffe/Material
        betrag:   verschnittWert,
        erstellt_von,
      })
    }
  }

  // Zuschnitt-Protokoll
  await sb.from('zuschnitt_protokoll').insert({
    stamm_id, auftrag_id,
    zugeschnitten_menge, verschnitt_menge,
    belegnr, erstellt_von, datum,
  }) // Tabelle optional

  return { belegnr }
}

// ─── BELEGVORSCHAU & PDF ──────────────────────────────────────────────────────

/**
 * Beleg-Daten fuer PDF/Vorschau aufbereiten
 * Unabhaengig von Beleg-Typ (VK, EK, Mahnung etc.)
 */
export async function ladeBelegFuerVorschau(beleg_id, beleg_typ) {
  const sb = getSupabaseClient()

  if (beleg_typ === 'verkauf') {
    const { data: beleg } = await sb.from('verkaufsbelege')
      .select('*, kunde:geschaeftspartner(*), positionen:verkauf_positionen(*, artikel:artikel(bezeichnung,artikelnr))')
      .eq('id', beleg_id).single()
    return beleg
  }
  if (beleg_typ === 'einkauf') {
    const { data: beleg } = await sb.from('einkaufsbelege')
      .select('*, lieferant:geschaeftspartner(*), positionen:einkauf_positionen(*, artikel:artikel(bezeichnung,artikelnr))')
      .eq('id', beleg_id).single()
    return beleg
  }
  return null
}

/**
 * Manuelle Rechnung anlegen (ohne vorherigen Auftrag/Lieferschein)
 * Direkt aus Verkaufs- oder Einkaufsmodul heraus
 */
export async function manuelleVerkaufsrechnungAnlegen({
  kunde_id, datum, positionen, notizen, zahlungsziel = 30, erstellt_von
}) {
  const sb = getSupabaseClient()
  const belegnr = nextBelegnr('VK-RE')
  const berechnete = berechnePositionen(positionen)
  const faellig = faelligkeitsDatum(datum, zahlungsziel)

  const { data: beleg, error } = await sb.from('verkaufsbelege').insert({
    belegnr, typ: 'rechnung',
    kunde_id, datum,
    nettobetrag:   berechnete.netto,
    steuerbetrag:  berechnete.steuer,
    bruttobetrag:  berechnete.brutto,
    faelligkeitsdatum: faellig,
    status: 'offen',
    notizen, erstellt_von,
  }).select().single()

  if (error) throw new Error(error.message)

  // Positionen speichern
  if (positionen.length > 0) {
    const { error: posError } = await sb.from('verkauf_positionen').insert(
      positionen.map((p, idx) => ({
        beleg_id:   beleg.id,
        artikel_id: p.artikel_id || null,
        bezeichnung: p.bezeichnung,
        menge:       p.menge,
        einheit:     p.einheit || 'Stk',
        einzelpreis: p.einzelpreis,
        mwst_satz:   p.mwst_satz || 19,
        nettobetrag: p.menge * p.einzelpreis,
      }))
    )
    if (posError) {
      console.error('manuelleVerkaufsrechnungAnlegen: Positionen-Insert fehlgeschlagen:', posError.message)
      throw new Error(`Rechnung angelegt, aber Positionen fehlgeschlagen: ${posError.message}`)
    }
  }

  // Buchungssatz automatisch
  await verkaufRechnungBuchen({
    referenz_id: beleg.id,
    datum,
    positionen,
    notizen,
    erstellt_von,
  })

  return beleg
}

export async function manuelleEinkaufsrechnungAnlegen({
  lieferant_id, datum, lieferantenrechnungsnr, positionen,
  notizen, zahlungsziel = 30, erstellt_von
}) {
  return einkaufRechnungBuchen({
    referenz_id: null,
    referenz_typ: 'manuell',
    lieferantenrechnungsnr,
    datum,
    faelligkeitsdatum: faelligkeitsDatum(datum, zahlungsziel),
    positionen,
    notizen,
    erstellt_von,
    lieferant_id,
  })
}
