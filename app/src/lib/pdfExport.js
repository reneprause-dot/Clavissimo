/**
 * Clavissimo – PDF-Export
 * Kein PDF-Library-Overhead nötig: öffnet eine sauber formatierte
 * Druckansicht in einem neuen Fenster und ruft window.print() auf —
 * jeder Browser bietet dort "Als PDF speichern" nativ an.
 *
 * Signatur passend zu Verkauf.jsx: druckBeleg({ beleg, positionen, firma, typ })
 */

const BELEG_TITEL = {
  angebot: 'Angebot',
  auftrag: 'Auftragsbestätigung',
  lieferschein: 'Lieferschein',
  rechnung: 'Rechnung',
  gutschrift: 'Gutschrift',
  bestellung: 'Bestellung',
  wareneingang: 'Wareneingangsbestätigung',
}

function fmtEuro(n) {
  return (parseFloat(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDatum(d) {
  if (!d) return '–'
  return new Date(d).toLocaleDateString('de-DE')
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

const MAHN_TEXTE = {
  1: { titel: 'Zahlungserinnerung', text: 'wir möchten Sie freundlich darauf hinweisen, dass die untenstehende Rechnung noch offen ist. Vermutlich haben Sie die Zahlung schlicht übersehen — falls die Zahlung bereits erfolgt ist, betrachten Sie dieses Schreiben als gegenstandslos.' },
  2: { titel: '1. Mahnung', text: 'trotz Zahlungserinnerung ist die untenstehende Rechnung weiterhin offen. Wir bitten Sie, den fälligen Betrag umgehend zu begleichen.' },
  3: { titel: '2. Mahnung', text: 'die untenstehende Rechnung ist trotz mehrfacher Erinnerung weiterhin unbeglichen. Wir bitten Sie letztmalig, den Betrag innerhalb von 7 Tagen zu begleichen, um weitere Schritte zu vermeiden.' },
}

export function druckMahnung({ op, stufe, firma = {} }) {
  const partner = op.partner || {}
  const info = MAHN_TEXTE[stufe] || MAHN_TEXTE[1]

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>${esc(info.titel)} ${esc(op.belegnr||'')}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color:#17241A; padding: 40px; max-width: 800px; margin:0 auto; font-size:13px; }
  h1 { font-size: 20px; margin: 0 0 20px; color:#B4650F; }
  .kopf { margin-bottom: 28px; }
  table { width:100%; border-collapse:collapse; margin: 20px 0; }
  th { text-align:left; font-size:10px; text-transform:uppercase; color:#748575; border-bottom:2px solid #DCE6DC; padding:6px 8px; }
  td { padding:8px; border-bottom:1px solid #DCE6DC; }
  .betrag { font-weight:700; font-size:16px; color:#B3261E; text-align:right; margin-top:16px; }
  @media print { body { padding:0; } }
</style>
</head><body>
  <div class="kopf">
    ${esc(firma.name||'')}<br>${esc(firma.strasse||'')}<br>${esc(firma.plz||'')} ${esc(firma.ort||'')}
  </div>
  <p>${esc(partner.name||'')}<br>${esc(partner.strasse||'')}<br>${esc(partner.plz||'')} ${esc(partner.ort||'')}</p>

  <h1>${esc(info.titel)}</h1>
  <p>Sehr geehrte Damen und Herren,</p>
  <p>${esc(info.text)}</p>

  <table>
    <thead><tr><th>Beleg</th><th>Fällig seit</th><th style="text-align:right">Betrag</th></tr></thead>
    <tbody>
      <tr><td>${esc(op.belegnr||'–')}</td><td>${fmtDatum(op.faelligkeitsdatum)}</td><td style="text-align:right">€ ${fmtEuro(op.offen)}</td></tr>
    </tbody>
  </table>

  <div class="betrag">Offener Betrag: € ${fmtEuro(op.offen)}</div>

  <p style="margin-top:32px">Mit freundlichen Grüßen<br>${esc(firma.name||'')}</p>

  <script>window.onload = () => setTimeout(() => window.print(), 200)</script>
</body></html>`

  const fenster = window.open('', '_blank', 'width=850,height=1000')
  if (!fenster) throw new Error('Popup wurde vom Browser blockiert — bitte Popups für diese Seite erlauben.')
  fenster.document.write(html)
  fenster.document.close()
}

export function druckBeleg({ beleg, positionen, firma = {}, typ }) {
  if (!beleg) throw new Error('Kein Beleg übergeben.')
  const belegTyp = typ || beleg.typ
  const titel = BELEG_TITEL[belegTyp] || 'Beleg'
  const partner = beleg.kunde || beleg.lieferant || {}
  const pos = positionen || []

  const nettoGesamt = pos.reduce((s, p) => s + (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0), 0)
  const steuerGesamt = pos.reduce((s, p) => s + (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0) * (parseFloat(p.mwst_satz)||19)/100, 0)
  const bruttoGesamt = nettoGesamt + steuerGesamt

  const zeilen = pos.map(p => `
    <tr>
      <td>${esc(p.bezeichnung)}</td>
      <td style="text-align:right">${esc(p.menge)} ${esc(p.einheit||'')}</td>
      <td style="text-align:right">€ ${fmtEuro(p.einzelpreis)}</td>
      <td style="text-align:right">${esc(p.mwst_satz||19)}%</td>
      <td style="text-align:right">€ ${fmtEuro((parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0))}</td>
    </tr>`).join('')

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>${esc(titel)} ${esc(beleg.belegnr||'')}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color:#17241A; padding: 40px; max-width: 800px; margin:0 auto; font-size:13px; }
  h1 { font-size: 22px; margin: 0 0 4px; color:#16A34A; }
  .sub { color:#748575; font-size:12px; margin-bottom: 28px; }
  .kopf { display:flex; justify-content:space-between; margin-bottom: 28px; }
  .kopf .von, .kopf .an { width: 45%; }
  .kopf h3 { font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#748575; margin:0 0 6px; }
  .meta { display:flex; gap:24px; margin-bottom:24px; font-size:12px; }
  .meta div span { display:block; color:#748575; font-size:10px; text-transform:uppercase; }
  table { width:100%; border-collapse:collapse; margin-bottom: 20px; }
  th { text-align:left; font-size:10px; text-transform:uppercase; color:#748575; border-bottom:2px solid #DCE6DC; padding:6px 8px; }
  th:not(:first-child), td:not(:first-child) { text-align:right; }
  td { padding:8px; border-bottom:1px solid #DCE6DC; }
  .summen { width:280px; margin-left:auto; }
  .summen div { display:flex; justify-content:space-between; padding:4px 8px; }
  .summen .brutto { font-weight:700; font-size:15px; border-top:2px solid #16A34A; margin-top:4px; padding-top:8px; }
  @media print { body { padding:0; } }
</style>
</head><body>
  <h1>🌿 ${esc(firma.name || 'Clavissimo')}</h1>
  <div class="sub">${esc(titel)}</div>

  <div class="kopf">
    <div class="von">
      <h3>Von</h3>
      ${esc(firma.name||'')}<br>${esc(firma.strasse||'')}<br>${esc(firma.plz||'')} ${esc(firma.ort||'')}
      ${firma.email ? `<br>${esc(firma.email)}` : ''}
    </div>
    <div class="an">
      <h3>An</h3>
      ${esc(partner.name||'')}<br>${esc(partner.strasse||'')}<br>${esc(partner.plz||'')} ${esc(partner.ort||'')}
      ${partner.kundennr ? `<br>Kundennr.: ${esc(partner.kundennr)}` : ''}
    </div>
  </div>

  <div class="meta">
    <div><span>Belegnummer</span>${esc(beleg.belegnr||'–')}</div>
    <div><span>Datum</span>${fmtDatum(beleg.datum)}</div>
    ${beleg.lieferdatum ? `<div><span>Lieferdatum</span>${fmtDatum(beleg.lieferdatum)}</div>` : ''}
    ${beleg.faelligkeitsdatum ? `<div><span>Fällig am</span>${fmtDatum(beleg.faelligkeitsdatum)}</div>` : ''}
  </div>

  <table>
    <thead><tr><th>Bezeichnung</th><th>Menge</th><th>Einzelpreis</th><th>MwSt</th><th>Gesamt</th></tr></thead>
    <tbody>${zeilen}</tbody>
  </table>

  <div class="summen">
    <div><span>Netto</span><span>€ ${fmtEuro(nettoGesamt)}</span></div>
    <div><span>MwSt</span><span>€ ${fmtEuro(steuerGesamt)}</span></div>
    <div class="brutto"><span>Gesamt</span><span>€ ${fmtEuro(bruttoGesamt)}</span></div>
  </div>

  ${beleg.notizen ? `<p style="margin-top:24px;color:#3E4E40">${esc(beleg.notizen)}</p>` : ''}

  <script>window.onload = () => setTimeout(() => window.print(), 200)</script>
</body></html>`

  const fenster = window.open('', '_blank', 'width=850,height=1000')
  if (!fenster) throw new Error('Popup wurde vom Browser blockiert — bitte Popups für diese Seite erlauben.')
  fenster.document.write(html)
  fenster.document.close()
}
