/**
 * Clavissimo – E-Mail-Service
 * Der eigentliche Versand läuft über den Proxy (SMTP-Zugangsdaten bleiben
 * serverseitig, siehe proxy/proxy.js /api/send-email). Diese Datei baut
 * nur die E-Mail-Inhalte zusammen und ruft den Proxy auf.
 *
 * Hinweis zu Anhängen: Es wird KEIN PDF angehängt (Clavissimo erzeugt
 * PDFs nur über die Browser-Druckansicht, siehe pdfExport.js — dafür
 * gibt es serverseitig keine Bytes zum Anhängen). Stattdessen enthält
 * die E-Mail den Beleg als Tabelle direkt im Text. Wer ein PDF braucht,
 * nutzt zusätzlich den "📄 PDF"-Button.
 */
import { getSupabaseClient } from './supabase'

const PROXY_URL = import.meta.env.VITE_PROXY_URL || ''

export function isEmailKonfiguriert() {
  // Kann von hier aus nicht wissen, ob SMTP im Proxy gesetzt ist — nur,
  // ob der Proxy grundsätzlich erreichbar konfiguriert ist. Der eigentliche
  // Versand-Versuch liefert bei fehlendem SMTP eine klare Fehlermeldung.
  return Boolean(PROXY_URL)
}

export async function ladeEmailConfig() {
  const sb = getSupabaseClient()
  const { data } = await sb.from('einstellungen').select('key,value').in('key', ['firma_name', 'firma_email'])
  const map = {}
  ;(data || []).forEach(e => { map[e.key] = e.value })
  return { absenderName: map.firma_name || 'Clavissimo', replyTo: map.firma_email || null }
}

function fmtEuro(n) { return (parseFloat(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])) }

const BELEG_TITEL = { angebot:'Angebot', auftrag:'Auftragsbestätigung', lieferschein:'Lieferschein', rechnung:'Rechnung', gutschrift:'Gutschrift' }

/** Baut Betreff + HTML-Body für einen Verkaufsbeleg. */
export function erstelleRechnungsEmail(beleg, positionen, firma = {}) {
  const titel = BELEG_TITEL[beleg.typ] || 'Beleg'
  const brutto = (positionen || []).reduce((s, p) => s + (parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0)*(1+(parseFloat(p.mwst_satz)||19)/100), 0)

  const zeilen = (positionen || []).map(p => `
    <tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(p.bezeichnung)}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${esc(p.menge)} ${esc(p.einheit||'')}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">€ ${fmtEuro((parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0))}</td></tr>
  `).join('')

  const html = `
    <div style="font-family:Arial,sans-serif;color:#17241A;max-width:600px">
      <h2 style="color:#16A34A;margin:0 0 4px">${esc(firma.name || 'Clavissimo')}</h2>
      <p style="color:#748575;margin:0 0 20px">${esc(titel)} ${esc(beleg.belegnr || '')}</p>
      <p>Anbei ${esc(titel).toLowerCase()} ${esc(beleg.belegnr)} vom ${beleg.datum ? new Date(beleg.datum).toLocaleDateString('de-DE') : ''}.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr><th style="text-align:left;padding:6px 8px;border-bottom:2px solid #16A34A">Position</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid #16A34A">Menge</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid #16A34A">Betrag</th></tr></thead>
        <tbody>${zeilen}</tbody>
      </table>
      <p style="font-weight:bold;font-size:16px">Gesamt: € ${fmtEuro(brutto)}</p>
      <p style="color:#748575;font-size:12px;margin-top:24px">${esc(firma.name||'')} · ${esc(firma.strasse||'')} · ${esc(firma.plz||'')} ${esc(firma.ort||'')}</p>
    </div>`

  return { betreff: `${titel} ${beleg.belegnr || ''}`.trim(), html }
}

/**
 * @param {object} p
 * @param {string} p.to
 * @param {string} p.subject
 * @param {string} p.html
 */
export async function sendeEmail({ to, subject, html }) {
  if (!PROXY_URL) return { ok: false, error: 'VITE_PROXY_URL ist nicht konfiguriert.' }
  if (!to) return { ok: false, error: 'Keine Empfänger-E-Mail-Adresse.' }

  try {
    const sb = getSupabaseClient()
    const { data: sessionData } = await sb.auth.getSession()
    const token = sessionData?.session?.access_token

    const res = await fetch(`${PROXY_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ to, subject, html }),
    })
    const result = await res.json()
    return result
  } catch (e) {
    return { ok: false, error: e.message }
  }
}
