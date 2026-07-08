/**
 * Clavis ERP – Verkauf
 * Angebote → Aufträge → Lieferscheine → Rechnungen → OP
 * Mit Storno-Button und E-Mail-Versand
 */
import { useEffect, useState, useCallback } from 'react'
import { heute, normDatum, normZeit, faelligAm, jetzt } from '../lib/zeitHelfer'
import BelegVorschau from '../components/BelegVorschau'
import { sendeEmail, erstelleRechnungsEmail, ladeEmailConfig, isEmailKonfiguriert } from '../lib/emailService'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { verkaufRechnungBuchen, verkaufLieferscheinBuchen, zahlungBuchen, verkaufAngebotAnlegen, verkaufAuftragAnlegen, manuelleVerkaufsrechnungAnlegen } from '../lib/buchungslogik'
import { triggerEvent, hatBlockierung, blockierungsGruende, EVENTS } from '../lib/modulIntegration'
import { bucheBtMBewegungenFuerPositionen } from '../lib/btmBuch'
import { ladeVerfuegbareChargen } from '../lib/chargenAuswahl'
import { storniereVKBeleg } from '../lib/stornoLogik'
import { druckBeleg } from '../lib/pdfExport'
import EmailPanel from '../components/EmailPanel'
import { logAudit } from '../lib/auditTrail'

const BELEG_TYPEN = ['angebot','auftrag','lieferschein','rechnung','gutschrift']
const STATUS_FARBE = { entwurf:'var(--text-muted,#475569)', offen:'var(--accent,#2563eb)', bestaetigt:'#7c3aed', geliefert:'#d97706', gebucht:'var(--success,#059669)', bezahlt:'var(--success,#10b981)', storniert:'var(--danger,#dc2626)', abgelehnt:'var(--danger,#ef4444)' }
const TYP_WORKFLOW = { angebot:['auftrag'], auftrag:['lieferschein'], lieferschein:['rechnung'], rechnung:[], gutschrift:[] }

export default function Verkauf() {
  const { erpUser, hasRole } = useAuth()
  const { activeModules } = useModules()
  const [belege, setBelege] = useState([])
  const [kunden, setKunden] = useState([])
  const [artikel, setArtikel] = useState([])
  const [konten, setKonten] = useState([])
  const [firma, setFirma] = useState({})
  const [loading, setLoading] = useState(true)
  const [aktivesBelege, setAktivesBelege] = useState(null)
  const [positionen, setPositionen] = useState([])
  const [filter, setFilter] = useState({ typ:'alle', status:'alle', suche:'' })
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]               = useState(null)
  const [vorschauBeleg, setVorschauBeleg] = useState(null)
  const [zeigeManRechnung, setZeigeManRechnung] = useState(false)
  const [manRechForm, setManRechForm] = useState({ kunde_id:'', datum:heute(), zahlungsziel:30, notizen:'', positionen:[{ bezeichnung:'', menge:1, einheit:'Stk', einzelpreis:0, mwst_satz:19 }] })
  const [manRechSaving, setManRechSaving] = useState(false)
  const [emailPanel, setEmailPanel] = useState(null)
  const [stornoModal, setStornoModal] = useState(null)
  const [stornoGrund, setStornoGrund] = useState('')

  const load = useCallback(async () => {
    const sb = getSupabaseClient()
    const [{ data: b }, { data: k }, { data: a }, { data: ko }, { data: ein }] = await Promise.all([
      sb.from('verkaufsbelege').select('*, kunde:geschaeftspartner(id,name,email,strasse,plz,ort,kundennr)').order('created_at', { ascending: false }),
      sb.from('geschaeftspartner').select('id,name,email,kundennr,strasse,plz,ort,zahlungsziel,skonto_prozent,skonto_tage').in('typ', ['kunde','beide']).eq('aktiv', true).order('name'),
      sb.from('artikel').select('id,artikelnr,bezeichnung,verkaufspreis,mwst_satz,einheit,bestand,btm_pflichtig').eq('aktiv', true).order('artikelnr'),
      sb.from('konten').select('id,nummer,bezeichnung').eq('aktiv', true).order('nummer'),
      sb.from('einstellungen').select('*'),
    ])
    setBelege(b || [])
    setKunden(k || [])
    setArtikel(a || [])
    setKonten(ko || [])
    const einMap = {}
    ;(ein || []).forEach(e => {
      if (e.key?.startsWith('firma_')) einMap[e.key.replace('firma_', '')] = e.value
      if (e.key === 'logo_url') einMap.logo_url = e.value
    })
    setFirma(einMap)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const loadPositionen = async (belegId) => {
    const sb = getSupabaseClient()
    const { data } = await sb.from('verkauf_positionen').select('*, artikel:artikel(artikelnr,bezeichnung)').eq('beleg_id', belegId).order('created_at')
    setPositionen(data || [])
  }

  const selectBeleg = async (b) => {
    setAktivesBelege(b)
    await loadPositionen(b.id)
    setModal(null)
  }

  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000) }

  // ── Beleg anlegen / bearbeiten ────────────────────────────────────
  const neuerBeleg = (typ = 'angebot', basisBeleg = null) => {
    const heuteStr = heute()
    const zahlungsziel = basisBeleg?.kunde?.zahlungsziel || 30
    setForm({
      typ,
      datum: heuteStr,
      faelligkeitsdatum: faelligAm(zahlungsziel),
      kunde_id: basisBeleg?.kunde_id || '',
      notizen: basisBeleg ? `Aus ${basisBeleg.typ} ${basisBeleg.belegnr}` : '',
      positionen: basisBeleg ? positionen.map(p => ({ ...p, id: undefined, beleg_id: undefined })) : [initPos()],
    })
    setModal('beleg')
  }

  const saveBeleg = async () => {
    if (!form.kunde_id || !form.positionen?.length) return
    setSaving(true)

    // Modul-Integration: MedCanG Compliance-Check
    const integErg = await triggerEvent(EVENTS.VERKAUF_BELEG_ERSTELLT, {
      kundeId: form.kunde_id,
      positionen: form.positionen,
    }, { activeModules, erpUser })
    if (hatBlockierung(integErg)) {
      showMsg(false, blockierungsGruende(integErg).join(' ') || 'Verkauf durch Compliance-Prüfung blockiert.')
      setSaving(false); return
    }

    try {
      let beleg, belegnr

      if (form.typ === 'angebot') {
        const result = await verkaufAngebotAnlegen({
          kunde_id: form.kunde_id, datum: form.datum,
          positionen: form.positionen, notizen: form.notizen, erstellt_von: erpUser?.id,
        })
        if (result.error) throw new Error(result.error.message)
        beleg = result.data; belegnr = beleg?.belegnr

      } else if (form.typ === 'auftrag') {
        const result = await verkaufAuftragAnlegen({
          kunde_id: form.kunde_id, datum: form.datum,
          positionen: form.positionen, notizen: form.notizen,
          erstellt_von: erpUser?.id, angebot_id: form.angebot_id || null,
        })
        if (result.error) throw new Error(result.error.message)
        beleg = result.data; belegnr = beleg?.belegnr

      } else if (form.typ === 'rechnung') {
        const result = await manuelleVerkaufsrechnungAnlegen({
          kunde_id: form.kunde_id, datum: form.datum,
          faelligkeitsdatum: form.faelligkeitsdatum,
          positionen: form.positionen, notizen: form.notizen, erstellt_von: erpUser?.id,
        })
        if (result.error) throw new Error(result.error.message)
        beleg = result.data; belegnr = beleg?.belegnr

      } else {
        // Lieferschein, Gutschrift: direkt in Supabase
        const sb = getSupabaseClient()
        belegnr = genBelegnr(form.typ)
        const netto = form.positionen.reduce((s, p) => s + (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0), 0)
        const steuer = form.positionen.reduce((s, p) => s + (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0) * (parseFloat(p.mwst_satz)||19) / 100, 0)
        const { data: neu, error: bErr } = await sb.from('verkaufsbelege').insert({
          belegnr, typ: form.typ, status: 'offen', kunde_id: form.kunde_id,
          datum: form.datum, faelligkeitsdatum: form.faelligkeitsdatum,
          nettobetrag: netto, steuerbetrag: steuer, bruttobetrag: netto + steuer,
          notizen: form.notizen, erstellt_von: erpUser?.id,
        }).select('*, kunde:geschaeftspartner(id,name,email,strasse,plz,ort,kundennr)').single()
        if (bErr) throw new Error(bErr.message)
        beleg = neu
        const { error: posError } = await sb.from('verkauf_positionen').insert(
          form.positionen.filter(p => p.artikel_id && p.menge).map(p => ({
            beleg_id: beleg.id, artikel_id: p.artikel_id,
            bezeichnung: p.bezeichnung || artikel.find(a => a.id === p.artikel_id)?.bezeichnung,
            menge: parseFloat(p.menge), einheit: p.einheit || 'Stk',
            einzelpreis: parseFloat(p.einzelpreis), mwst_satz: parseFloat(p.mwst_satz) || 19,
            nettobetrag: parseFloat(p.menge) * parseFloat(p.einzelpreis),
          }))
        )
        if (posError) throw new Error(posError.message)
      }

      await logAudit({ aktion: 'erstellt', modul: 'verkauf', tabelle: 'verkaufsbelege', datensatzId: beleg?.id, datensatzBezeichnung: belegnr })
      showMsg(true, `${form.typ} ${belegnr} angelegt.`)
      setModal(null); load()
      if (beleg?.id) {
        const { data: refreshed } = await getSupabaseClient().from('verkaufsbelege')
          .select('*, kunde:geschaeftspartner(id,name,email,strasse,plz,ort,kundennr)').eq('id', beleg.id).single()
        if (refreshed) selectBeleg(refreshed)
      }
    } catch(e) {
      showMsg(false, `Fehler: ${e.message}`)
    }
    setSaving(false)
  }

  // ── Buchen ────────────────────────────────────────────────────────
  const bucheBeleg = async (beleg) => {
    setSaving(true)
    try {
      if (beleg.typ === 'lieferschein') {
        await verkaufLieferscheinBuchen({ auftrag_id: beleg.id, lieferdatum: beleg.datum, positionen_geliefert: positionen.map(p=>({...p,gelieferte_menge:p.menge})), erstellt_von: erpUser?.id })
        // BtM-Buch (§13 BtMVV): physischer Warenausgang, daher hier und
        // nicht erst bei der Rechnung. Nur BtM-pflichtige Artikel werden
        // tatsächlich gebucht — bucheBtMBewegung prüft das selbst.
        await bucheBtMBewegungenFuerPositionen('abgang', positionen, {
          partnerId: beleg.kunde_id, belegnr: beleg.belegnr, userId: erpUser?.id,
        })
        showMsg(true, 'Lieferschein gebucht — Bestand reduziert.')
      } else if (beleg.typ === 'rechnung') {
        await verkaufRechnungBuchen({ referenz_id: beleg.id, datum: beleg.datum, positionen, notizen: beleg.notizen, erstellt_von: erpUser?.id })
        showMsg(true, 'Rechnung gebucht — Debitor-OP angelegt.')
      }
      load(); loadPositionen(beleg.id)
      const { data: refreshed } = await getSupabaseClient().from('verkaufsbelege').select('*, kunde:geschaeftspartner(id,name,email,strasse,plz,ort,kundennr)').eq('id', beleg.id).single()
      setAktivesBelege(refreshed)
    } catch(e) { showMsg(false, e.message) }
    setSaving(false)
  }

  // ── Storno ────────────────────────────────────────────────────────
  const handleStorno = async () => {
    if (!stornoGrund.trim()) { showMsg(false, 'Bitte Stornogrund angeben.'); return }
    setSaving(true)
    try {
      const stornoBeleg = await storniereVKBeleg(stornoModal.id, erpUser?.id, stornoGrund)
      showMsg(true, `Storno ${stornoBeleg.belegnr} erstellt.`)
      setStornoModal(null); setStornoGrund('')
      load()
      const { data: refreshed } = await getSupabaseClient().from('verkaufsbelege').select('*, kunde:geschaeftspartner(id,name,email,strasse,plz,ort,kundennr)').eq('id', stornoModal.id).single()
      setAktivesBelege(refreshed)
    } catch(e) { showMsg(false, e.message) }
    setSaving(false)
  }

  // ── Filtern ───────────────────────────────────────────────────────
  const filtered = belege.filter(b => {
    if (filter.typ !== 'alle' && b.typ !== filter.typ) return false
    if (filter.status !== 'alle' && b.status !== filter.status) return false
    if (filter.suche && !b.belegnr?.toLowerCase().includes(filter.suche.toLowerCase()) && !b.kunde?.name?.toLowerCase().includes(filter.suche.toLowerCase())) return false
    return true
  })

  const heuteDate = new Date()
  const offeneOPs = belege.filter(b => b.typ === 'rechnung' && b.status === 'gebucht')
  const umsatzMonat = belege.filter(b => b.typ === 'rechnung' && b.status !== 'storniert' && new Date(b.datum).getMonth() === heuteDate.getMonth()).reduce((s, b) => s + (b.bruttobetrag || 0), 0)

  return (
    <div style={{ display:'flex', height:'100vh', color:'var(--text-primary,#e2e8f0)', fontFamily:"'IBM Plex Mono',monospace" }}>

      {/* Linke Liste */}
      <div style={{ width:320, background:'var(--bg-secondary,#1a1f2e)', borderRight:'1px solid var(--border,#2d3748)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'0.85rem', borderBottom:'1px solid var(--border,#2d3748)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.65rem' }}>
            <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700 }}>💰 Verkauf</h2>
            {hasRole('user') && <button onClick={() => neuerBeleg('angebot')} style={btnSmall('var(--accent,#2563eb)')}>+ Neu</button>}
          </div>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem', marginBottom:'0.65rem' }}>
            <div style={{ background:'var(--bg-primary,#0f1117)', borderRadius:6, padding:'0.4rem 0.6rem', textAlign:'center' }}>
              <div style={{ color:'var(--text-muted,#475569)', fontSize:'0.58rem', textTransform:'uppercase' }}>Umsatz Monat</div>
              <div style={{ color:'var(--success,#10b981)', fontFamily:'monospace', fontSize:'0.85rem', fontWeight:700 }}>€{(umsatzMonat/1000).toFixed(1)}k</div>
            </div>
            <div style={{ background:'var(--bg-primary,#0f1117)', borderRadius:6, padding:'0.4rem 0.6rem', textAlign:'center' }}>
              <div style={{ color:'var(--text-muted,#475569)', fontSize:'0.58rem', textTransform:'uppercase' }}>Offene Rechnungen</div>
              <div style={{ color:offeneOPs.length>0?'var(--warning,#fbbf24)':'var(--text-muted,#475569)', fontFamily:'monospace', fontSize:'0.85rem', fontWeight:700 }}>{offeneOPs.length}</div>
            </div>
          </div>
          {/* Filter */}
          <input value={filter.suche} onChange={e=>setFilter({...filter,suche:e.target.value})} placeholder="Nr. / Kunde suchen..." style={suchInp} />
          <div style={{ display:'flex', gap:'0.3rem', marginTop:'0.4rem', flexWrap:'wrap' }}>
            {['alle',...BELEG_TYPEN].map(t => (
              <button key={t} onClick={() => setFilter({...filter,typ:t})} style={{ borderRadius:20, padding:'0.15rem 0.5rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.62rem', background:filter.typ===t?'var(--accent,#2563eb)':'transparent', color:filter.typ===t?'#fff':'var(--text-muted,#475569)', border:filter.typ===t?'none':'1px solid var(--border,#2d3748)' }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ flex:1, overflow:'auto' }}>
          {loading ? <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted,#475569)' }}>Lade...</div>
          : filtered.length === 0 ? <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted,#475569)' }}>Keine Belege</div>
          : filtered.map(b => (
            <div key={b.id} onClick={() => selectBeleg(b)}
              style={{ padding:'0.65rem 0.85rem', borderBottom:'1px solid var(--border,#1e293b)', cursor:'pointer', background:aktivesBelege?.id===b.id?'var(--accent-hover,#1e3a8a)22':'transparent', borderLeft:aktivesBelege?.id===b.id?'3px solid var(--accent,#2563eb)':'3px solid transparent', opacity:b.storniert?0.45:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ color:'var(--accent-light,#60a5fa)', fontFamily:'monospace', fontSize:'0.72rem' }}>{b.belegnr}</span>
                <span style={{ background:(STATUS_FARBE[b.status]||'var(--text-muted,#475569)')+'22', color:STATUS_FARBE[b.status]||'var(--text-muted,#475569)', padding:'0.08rem 0.4rem', borderRadius:4, fontSize:'0.62rem' }}>{b.storniert?'storniert':b.status}</span>
              </div>
              <div style={{ color:'var(--text-primary,#e2e8f0)', fontSize:'0.82rem', fontWeight:500, marginTop:'0.15rem' }}>{b.kunde?.name}</div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.2rem' }}>
                <span style={{ color:'var(--text-muted,#475569)', fontSize:'0.7rem' }}>{new Date(b.datum).toLocaleDateString('de-DE')}</span>
                <span style={{ color:'var(--success,#10b981)', fontFamily:'monospace', fontSize:'0.75rem' }}>€ {(b.bruttobetrag||0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:'0.4rem 0.85rem', borderTop:'1px solid var(--border,#2d3748)', color:'var(--text-muted,#475569)', fontSize:'0.68rem' }}>{filtered.length} Belege</div>
      </div>

      {/* Detail */}
      <div style={{ flex:1, overflow:'auto', background:'var(--bg-primary,#0f1117)' }}>
        {!aktivesBelege ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted,#374151)', flexDirection:'column', gap:'0.5rem' }}>
            <div style={{ fontSize:'3rem' }}>💰</div><div>Beleg wählen oder neu anlegen</div>
          </div>
        ) : (
          <div style={{ padding:'1.25rem' }}>
            {msg && <div style={{ padding:'0.75rem 1rem', borderRadius:8, marginBottom:'1rem', background:msg.ok?'#064e3b':'#450a0a', color:msg.ok?'var(--success,#6ee7b7)':'var(--danger,#fca5a5)', border:`1px solid ${msg.ok?'var(--success,#10b981)':'var(--danger,#ef4444)'}`, fontSize:'0.85rem' }}>{msg.text}</div>}

            {/* Storno-Warnung */}
            {aktivesBelege.storniert && (
              <div style={{ padding:'0.75rem 1rem', background:'#450a0a', border:'1px solid var(--danger,#dc2626)', borderRadius:8, marginBottom:'1rem', color:'var(--danger,#fca5a5)', fontWeight:600 }}>
                ↩️ Dieser Beleg wurde storniert · Stornobeleg: {aktivesBelege.storno_belegnr}
              </div>
            )}

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem', flexWrap:'wrap', gap:'0.65rem' }}>
              <div>
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.2rem', flexWrap:'wrap' }}>
                  <span style={{ color:'var(--accent-light,#60a5fa)', fontFamily:'monospace', fontSize:'0.9rem', fontWeight:700 }}>{aktivesBelege.belegnr}</span>
                  <span style={{ background:(STATUS_FARBE[aktivesBelege.status]||'var(--text-muted,#475569)')+'22', color:STATUS_FARBE[aktivesBelege.status]||'var(--text-muted,#475569)', padding:'0.15rem 0.5rem', borderRadius:20, fontSize:'0.72rem' }}>
                    {aktivesBelege.storniert ? '↩️ Storniert' : aktivesBelege.status}
                  </span>
                </div>
                <h2 style={{ margin:0, fontSize:'1.2rem', fontWeight:700 }}>{aktivesBelege.typ.charAt(0).toUpperCase()+aktivesBelege.typ.slice(1)}</h2>
                <div style={{ color:'var(--text-secondary,#64748b)', fontSize:'0.8rem', marginTop:'0.2rem' }}>{aktivesBelege.kunde?.name} · {new Date(aktivesBelege.datum).toLocaleDateString('de-DE')}</div>
              </div>

              {/* Aktions-Buttons */}
              <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                {/* Workflow: Nächster Schritt */}
                {hasRole('user') && !aktivesBelege.storniert && TYP_WORKFLOW[aktivesBelege.typ]?.map(nextTyp => (
                  <button key={nextTyp} onClick={() => neuerBeleg(nextTyp, aktivesBelege)} style={btnSmall('#7c3aed')}>
                    → {nextTyp.charAt(0).toUpperCase()+nextTyp.slice(1)}
                  </button>
                ))}
                {/* Buchen */}
                {hasRole('user') && !aktivesBelege.storniert && ['lieferschein','rechnung'].includes(aktivesBelege.typ) && aktivesBelege.status === 'offen' && (
                  <button onClick={() => bucheBeleg(aktivesBelege)} disabled={saving} style={btnSmall('var(--success,#059669)')}>
                    {saving ? '⟳' : '✓'} Buchen
                  </button>
                )}
                {/* PDF */}
                <button onClick={async () => { try { await druckBeleg({ beleg: aktivesBelege, positionen, firma, typ: aktivesBelege.typ }) } catch(e) { showMsg(false, `PDF-Export fehlgeschlagen: ${e.message}`) } }} style={btnSmall('var(--accent,#0e7490)')}>📄 PDF</button>
                {/* E-Mail */}
                {aktivesBelege.kunde?.email && (
                  <button onClick={() => setEmailPanel(aktivesBelege)} style={btnSmall('var(--accent,#2563eb)')}>📧 E-Mail</button>
                )}
                {/* Storno */}
                {hasRole('manager') && !aktivesBelege.storniert && ['rechnung','gutschrift'].includes(aktivesBelege.typ) && (
                  <button onClick={() => { setStornoModal(aktivesBelege); setStornoGrund('') }} style={btnSmall('var(--danger,#dc2626)')}>↩️ Storno</button>
                )}
              </div>
            </div>

            {/* Beleginfo */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'0.65rem', marginBottom:'1.25rem' }}>
              {[
                { l:'Kunde', v:aktivesBelege.kunde?.name },
                { l:'Kundennr.', v:aktivesBelege.kunde?.kundennr || '–' },
                { l:'Datum', v:new Date(aktivesBelege.datum).toLocaleDateString('de-DE') },
                { l:'Fälligkeit', v:aktivesBelege.faelligkeitsdatum?new Date(aktivesBelege.faelligkeitsdatum).toLocaleDateString('de-DE'):'–' },
                { l:'Netto', v:`€ ${(aktivesBelege.nettobetrag||0).toFixed(2)}` },
                { l:'MwSt', v:`€ ${(aktivesBelege.steuerbetrag||0).toFixed(2)}` },
                { l:'Brutto', v:`€ ${(aktivesBelege.bruttobetrag||0).toFixed(2)}`, bold:true },
              ].map(k => (
                <div key={k.l} style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:8, padding:'0.6rem 0.75rem' }}>
                  <div style={{ color:'var(--text-muted,#475569)', fontSize:'0.65rem', textTransform:'uppercase', marginBottom:'0.2rem' }}>{k.l}</div>
                  <div style={{ color:k.l==='Brutto'?'var(--success,#10b981)':'var(--text-primary,#e2e8f0)', fontSize:'0.85rem', fontWeight:k.bold?700:400, fontFamily:k.l.includes('€')||k.l==='Brutto'||k.l==='Netto'||k.l==='MwSt'?'monospace':'inherit' }}>{k.v}</div>
                </div>
              ))}
            </div>

            {/* Positionen */}
            <div style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'0.65rem 1rem', background:'var(--bg-primary,#0f1117)', borderBottom:'1px solid var(--border,#2d3748)', color:'var(--text-primary,#e2e8f0)', fontWeight:600, fontSize:'0.88rem' }}>Positionen</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
                <thead><tr style={{ background:'#0a0a0a' }}>
                  {['Pos.','Artikel','Bezeichnung','Menge','Einheit','Einzelpreis','MwSt','Netto','Brutto'].map(h => (
                    <th key={h} style={{ padding:'0.55rem 0.85rem', textAlign:'left', color:'var(--text-muted,#475569)', fontWeight:600, fontSize:'0.65rem', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {positionen.length === 0
                    ? <tr><td colSpan={9} style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted,#475569)' }}>Keine Positionen</td></tr>
                    : positionen.map((p, i) => (
                      <tr key={p.id} style={{ borderTop:'1px solid var(--border,#1e293b)' }}>
                        <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-muted,#475569)' }}>{i+1}</td>
                        <td style={{ padding:'0.6rem 0.85rem' }}><span style={{ color:'var(--accent-light,#60a5fa)', fontFamily:'monospace', fontSize:'0.72rem' }}>{p.artikel?.artikelnr}</span></td>
                        <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-primary,#e2e8f0)' }}>{p.bezeichnung}</td>
                        <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--text-primary,#e2e8f0)' }}>{p.menge}</td>
                        <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-secondary,#94a3b8)' }}>{p.einheit}</td>
                        <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--text-secondary,#94a3b8)' }}>€ {parseFloat(p.einzelpreis||0).toFixed(2)}</td>
                        <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-secondary,#94a3b8)' }}>{p.mwst_satz}%</td>
                        <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--text-secondary,#94a3b8)' }}>€ {parseFloat(p.nettobetrag||0).toFixed(2)}</td>
                        <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--success,#10b981)', fontWeight:600 }}>€ {parseFloat(p.bruttobetrag||0).toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* Beleg anlegen */}
      {modal === 'beleg' && (
        <BelegModal form={form} setForm={setForm} kunden={kunden} artikel={artikel} onClose={() => setModal(null)} onSave={saveBeleg} saving={saving} />
      )}

      {/* Storno Modal */}
      {stornoModal && (
        <div style={{ position:'fixed', inset:0, background:'#000000cc', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--danger,#dc2626)', borderRadius:16, width:'100%', maxWidth:460, padding:'1.5rem', fontFamily:"'IBM Plex Mono',monospace" }}>
            <h2 style={{ margin:'0 0 1rem', color:'var(--danger,#fca5a5)', fontSize:'1.1rem' }}>↩️ Beleg stornieren</h2>
            <div style={{ background:'var(--bg-primary,#0f1117)', borderRadius:8, padding:'0.85rem', marginBottom:'1rem', fontSize:'0.82rem' }}>
              <div style={{ color:'var(--text-secondary,#94a3b8)' }}>Beleg: <span style={{ color:'var(--text-primary,#e2e8f0)', fontFamily:'monospace' }}>{stornoModal.belegnr}</span></div>
              <div style={{ color:'var(--text-secondary,#94a3b8)', marginTop:'0.3rem' }}>Betrag: <span style={{ color:'var(--danger,#ef4444)', fontFamily:'monospace', fontWeight:700 }}>€ {parseFloat(stornoModal.bruttobetrag||0).toFixed(2)}</span></div>
            </div>
            <div style={{ background:'#450a0a22', border:'1px solid var(--danger,#dc2626)55', borderRadius:8, padding:'0.75rem', marginBottom:'1rem', color:'var(--danger,#fca5a5)', fontSize:'0.78rem', lineHeight:1.6 }}>
              ⚠️ Diese Aktion ist nicht rückgängig zu machen. Es wird ein Stornobeleg mit eigener Belegnummer erstellt, der Debitor-OP wird storniert und der Bestand zurückgebucht.
            </div>
            <div style={{ marginBottom:'1rem' }}>
              <label style={lbl}>Stornogrund *</label>
              <input value={stornoGrund} onChange={e => setStornoGrund(e.target.value)} placeholder="z.B. Kundenwunsch, Falschlieferung..." style={inp} autoFocus />
            </div>
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
              <button onClick={() => setStornoModal(null)} style={btnSec}>Abbrechen</button>
              <button onClick={handleStorno} disabled={saving || !stornoGrund.trim()} style={{ background:'var(--danger,#dc2626)', color:'#fff', border:'none', borderRadius:8, padding:'0.6rem 1.25rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:600, opacity:!stornoGrund.trim()?0.5:1 }}>
                {saving ? '⟳' : '↩️'} Stornieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-Mail Panel */}
      {emailPanel && (
        <EmailPanel
          beleg={emailPanel} positionen={positionen} firma={firma}
          typ={emailPanel.typ} empfaenger={emailPanel.kunde}
          onClose={() => setEmailPanel(null)}
        />
      )}
    </div>
  )
}

// ── Beleg-Modal ───────────────────────────────────────────────────────────────
function BelegModal({ form, setForm, kunden, artikel, onClose, onSave, saving }) {
  const [chargenCache, setChargenCache] = useState({}) // artikel_id -> chargen[]

  const updatePos = (idx, field, val) => {
    const neu = [...form.positionen]
    neu[idx] = { ...neu[idx], [field]: val }
    if (field === 'artikel_id') {
      const a = artikel.find(a => a.id === val)
      if (a) { neu[idx].einzelpreis = a.verkaufspreis; neu[idx].mwst_satz = a.mwst_satz; neu[idx].einheit = a.einheit; neu[idx].bezeichnung = a.bezeichnung }
      neu[idx].charge_id = '' // Charge-Auswahl bei Artikelwechsel zurücksetzen
      if (a?.btm_pflichtig && val && !chargenCache[val]) {
        ladeVerfuegbareChargen(val).then(liste => setChargenCache(prev => ({ ...prev, [val]: liste })))
      }
    }
    setForm({ ...form, positionen: neu })
  }
  const addPos = () => setForm({ ...form, positionen: [...form.positionen, initPos()] })
  const delPos = (idx) => setForm({ ...form, positionen: form.positionen.filter((_, i) => i !== idx) })
  const netto = form.positionen?.reduce((s, p) => s + (parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0), 0) || 0
  const steuer = form.positionen?.reduce((s, p) => s + (parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0)*(parseFloat(p.mwst_satz)||19)/100, 0) || 0

  return (
    <div style={{ position:'fixed', inset:0, background:'#000000cc', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--accent,#2563eb)', borderRadius:16, width:'100%', maxWidth:900, maxHeight:'92vh', overflow:'auto', padding:'1.5rem', fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-primary,#e2e8f0)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <h2 style={{ margin:0, fontSize:'1.1rem' }}>Neuer {form.typ?.charAt(0).toUpperCase()+form.typ?.slice(1)}</h2>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-secondary,#64748b)', cursor:'pointer', fontSize:'1.2rem' }}>×</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.75rem', marginBottom:'1.25rem' }}>
          <div style={{ gridColumn:'span 3' }}>
            <label style={lbl}>Kunde *</label>
            <select value={form.kunde_id||''} onChange={e=>setForm({...form,kunde_id:e.target.value})} style={inp}>
              <option value="">– Kunde wählen –</option>
              {kunden.map(k=><option key={k.id} value={k.id}>{k.name} ({k.kundennr})</option>)}
            </select>
          </div>
          <div><label style={lbl}>Datum</label><input type="date" value={form.datum||''} onChange={e=>setForm({...form,datum:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Fälligkeit</label><input type="date" value={form.faelligkeitsdatum||''} onChange={e=>setForm({...form,faelligkeitsdatum:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Typ</label>
            <select value={form.typ||'angebot'} onChange={e=>setForm({...form,typ:e.target.value})} style={inp}>
              {BELEG_TYPEN.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'span 3' }}><label style={lbl}>Notizen</label><input value={form.notizen||''} onChange={e=>setForm({...form,notizen:e.target.value})} style={inp}/></div>
        </div>

        {/* Positionen */}
        <div style={{ marginBottom:'1rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
            <label style={{ ...lbl, marginBottom:0 }}>Positionen</label>
            <button onClick={addPos} style={btnSmall('var(--accent,#2563eb)')}>+ Position</button>
          </div>
          {(form.positionen||[]).map((p, idx) => {
            const gewaehlterArtikel = artikel.find(a => a.id === p.artikel_id)
            const istBtm = gewaehlterArtikel?.btm_pflichtig
            const verfuegbareChargen = chargenCache[p.artikel_id] || []
            return (
            <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1.3fr auto', gap:'0.4rem', marginBottom:'0.4rem', alignItems:'end' }}>
              <div>
                {idx===0&&<label style={lbl}>Artikel</label>}
                <select value={p.artikel_id||''} onChange={e=>updatePos(idx,'artikel_id',e.target.value)} style={{...inp,fontSize:'0.78rem'}}>
                  <option value="">– Artikel –</option>
                  {artikel.map(a=><option key={a.id} value={a.id}>{a.artikelnr} – {a.bezeichnung}{a.btm_pflichtig?' 🔒':''}</option>)}
                </select>
              </div>
              <div>
                {idx===0&&<label style={lbl}>Menge</label>}
                <input type="number" step="0.001" value={p.menge||''} onChange={e=>updatePos(idx,'menge',e.target.value)} style={{...inp,fontSize:'0.78rem'}} placeholder="0"/>
              </div>
              <div>
                {idx===0&&<label style={lbl}>Einzelpreis €</label>}
                <input type="number" step="0.01" value={p.einzelpreis||''} onChange={e=>updatePos(idx,'einzelpreis',e.target.value)} style={{...inp,fontSize:'0.78rem'}} placeholder="0.00"/>
              </div>
              <div>
                {idx===0&&<label style={lbl}>MwSt %</label>}
                <input type="number" value={p.mwst_satz||19} onChange={e=>updatePos(idx,'mwst_satz',e.target.value)} style={{...inp,fontSize:'0.78rem'}}/>
              </div>
              <div>
                {idx===0&&<label style={lbl}>Charge (BtM)</label>}
                {istBtm ? (
                  <select value={p.charge_id||''} onChange={e=>updatePos(idx,'charge_id',e.target.value)} style={{...inp,fontSize:'0.78rem', borderColor: p.charge_id?undefined:'var(--warning,#B4650F)'}}>
                    <option value="">– Charge wählen –</option>
                    {verfuegbareChargen.map(c => (
                      <option key={c.id} value={c.id}>{c.chargennr} (Best. {c.bestand}{c.mhd?`, MHD ${new Date(c.mhd).toLocaleDateString('de-DE')}`:''})</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ ...inp, fontSize:'0.72rem', color:'var(--text-muted,#475569)', background:'transparent', border:'1px dashed var(--border,#2d3748)' }}>–</div>
                )}
              </div>
              <button onClick={()=>delPos(idx)} style={{ background:'transparent', border:'none', color:'var(--danger,#ef4444)', cursor:'pointer', fontSize:'1.1rem', paddingBottom:'0.1rem' }}>×</button>
            </div>
            )
          })}
        </div>

        {/* Summen */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'2rem', padding:'0.75rem', background:'var(--bg-primary,#0f1117)', borderRadius:8, marginBottom:'1rem', fontSize:'0.85rem' }}>
          <div><span style={{ color:'var(--text-muted,#475569)' }}>Netto: </span><span style={{ color:'var(--text-secondary,#94a3b8)', fontFamily:'monospace' }}>€ {netto.toFixed(2)}</span></div>
          <div><span style={{ color:'var(--text-muted,#475569)' }}>MwSt: </span><span style={{ color:'var(--text-secondary,#94a3b8)', fontFamily:'monospace' }}>€ {steuer.toFixed(2)}</span></div>
          <div><span style={{ color:'var(--text-muted,#475569)' }}>Brutto: </span><span style={{ color:'var(--success,#10b981)', fontFamily:'monospace', fontWeight:700, fontSize:'1rem' }}>€ {(netto+steuer).toFixed(2)}</span></div>
        </div>

        <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', borderTop:'1px solid var(--border,#2d3748)', paddingTop:'1rem' }}>
          <button onClick={onClose} style={btnSec}>Abbrechen</button>
          <button onClick={onSave} disabled={saving||!form.kunde_id} style={{ ...btnPri, opacity:!form.kunde_id?0.5:1 }}>{saving?'⟳':'✓'} Anlegen</button>
        </div>
      </div>
    </div>
  )
}

function genBelegnr(typ) {
  const prefix = { angebot:'ANG', auftrag:'AUF', lieferschein:'LS', rechnung:'RE', gutschrift:'GS' }[typ] || 'VK'
  const d = new Date()
  return `${prefix}-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`
}

function initPos() { return { artikel_id:'', bezeichnung:'', menge:'', einheit:'Stk', einzelpreis:'', mwst_satz:19 } }

const lbl = { display:'block', color:'var(--text-secondary,#64748b)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.3rem' }
const inp = { width:'100%', background:'var(--bg-primary,#0f1117)', border:'1px solid var(--border,#2d3748)', borderRadius:8, padding:'0.6rem 0.75rem', color:'var(--text-primary,#e2e8f0)', fontSize:'0.85rem', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }
const suchInp = { width:'100%', background:'var(--bg-primary,#0f1117)', border:'1px solid var(--border,#2d3748)', borderRadius:8, padding:'0.45rem 0.7rem', color:'var(--text-primary,#e2e8f0)', fontFamily:'inherit', fontSize:'0.78rem', outline:'none', boxSizing:'border-box' }
const btnPri = { background:'var(--accent,#2563eb)', color:'#fff', border:'none', borderRadius:8, padding:'0.6rem 1.5rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:600 }
const btnSec = { background:'transparent', color:'var(--text-secondary,#94a3b8)', border:'1px solid var(--border,#2d3748)', borderRadius:8, padding:'0.6rem 1.25rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem' }
const btnSmall = (c) => ({ background:c, color:'#fff', border:'none', borderRadius:6, padding:'0.35rem 0.7rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.75rem', fontWeight:600, whiteSpace:'nowrap' })
