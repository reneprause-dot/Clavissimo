/**
 * Clavis ERP – MedCanG & Pharma (zusammengeführt)
 * Regulatorisches Compliance-Modul für:
 *   - Medizinisches Cannabis (MedCanG)
 *   - Pharmazeutische Produkte (AMG, GMP, GDP)
 * Aktivierung: eines oder beide Module können aktiv sein
 */
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useModules } from '../../context/ModuleContext'
import { triggerEvent, EVENTS } from '../../lib/modulIntegration'

const TABS = [
  { key:'artikel',     label:'🌿 Cannabis-Artikel',  modul:'medcang' },
  { key:'chargen',     label:'🏷️ Chargen & CoA',     modul:'medcang' },
  { key:'erlaubnisse', label:'📋 Erlaubnisse',        modul:'medcang' },
  { key:'pharma_art',  label:'💊 Pharma-Artikel',     modul:'pharma'  },
  { key:'pharma_reg',  label:'📚 Regulatory',         modul:'pharma'  },
  { key:'wiki',        label:'⚖️ Vorschriften',       modul:'both'    },
]

const MEDCANG_KAT = ['Cannabisblüten','Cannabisextrakt','Cannabinoid-Fertigarzneimittel','Cannabisharz','Zubereitungen']
const AMG_KAT     = ['Fertigarzneimittel','Wirkstoff','Hilfsstoff','Diagnostikum','Medizinprodukt','Tierarzneimittel']
const GMP_KLASSEN = ['A','B','C','D']

export default function MedCanGPharma() {
  const { erpUser, hasRole } = useAuth()
  const { isActive, activeModules } = useModules()
  const isMedCanG = isActive('medcang')
  const isPharma  = isActive('pharma')

  const [activeTab, setActiveTab] = useState(isMedCanG ? 'artikel' : 'pharma_art')
  const [artikel, setArtikel] = useState([])
  const [chargen, setChargen] = useState([])
  const [partner, setPartner] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = async () => {
    const sb = getSupabaseClient()
    setLoading(true)
    const [{ data: art }, { data: ch }, { data: par }] = await Promise.all([
      sb.from('artikel').select('id,artikelnr,bezeichnung,pzn,btm_pflichtig,medcang_kategorie,thc_gehalt,cbd_gehalt,sorte,bestand,einheit,aktiv,amg_zulassungsnummer,amg_kategorie,gmp_klasse,serialisierungspflichtig,temperaturklasse,haltbarkeit_tage').eq('aktiv',true).order('bezeichnung'),
      sb.from('chargen').select('*, artikel:artikel(bezeichnung,pzn,amg_zulassungsnummer)').order('created_at',{ascending:false}).limit(200),
      sb.from('geschaeftspartner').select('id,name,typ,medcang_erlaubnis,medcang_erlaubnis_gueltig,medcang_behoerde,btm_erlaubnis,btm_erlaubnis_gueltig,apotheken_ik,grosshandels_erlaubnis,amg_herstellungserlaubnis,amg_herstellungserlaubnis_gueltig,gdp_zertifikat,gdp_zertifikat_gueltig').eq('aktiv',true).order('name'),
    ])
    setArtikel(art||[]); setChargen(ch||[]); setPartner(par||[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  const showMsg = (ok, text) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),4000) }

  const saveChargeStatus = async (charge, neuerStatus) => {
    const sb = getSupabaseClient()
    await sb.from('chargen').update({ status: neuerStatus, freigabe_datum: neuerStatus==='freigegeben'?new Date().toISOString().split('T')[0]:null, freigabe_durch: neuerStatus==='freigegeben'?erpUser?.id:null }).eq('id', charge.id)
    // Integration: Freigabe/Sperrung auslösen
    if (neuerStatus === 'freigegeben') {
      await triggerEvent(EVENTS.CHARGE_FREIGEGEBEN, {
        chargeId: charge.id, chargeNr: charge.charge_nr || charge.chargennr, artikelId: charge.artikel_id,
      }, { activeModules, erpUser })
    } else if (neuerStatus === 'gesperrt') {
      await triggerEvent(EVENTS.CHARGE_GESPERRT, {
        chargeId: charge.id, chargeNr: charge.charge_nr || charge.chargennr, artikelId: charge.artikel_id, grund: 'MedCanG-Sperrung',
      }, { activeModules, erpUser })
    }
    showMsg(true, `Charge ${charge.charge_nr || charge.chargennr} → ${neuerStatus}`)
    load()
  }

  const filteredTabellen = TABS.filter(t =>
    t.modul === 'both' || (t.modul==='medcang' && isMedCanG) || (t.modul==='pharma' && isPharma)
  )

  const canvasFarbe = (art) => {
    if (art?.btm_pflichtig) return '#7c3aed'
    if (art?.medcang_kategorie) return 'var(--success,#059669)'
    if (art?.amg_kategorie) return 'var(--accent,#2563eb)'
    return 'var(--text-muted,#475569)'
  }

  return (
    <div style={{ padding:'1.5rem', color:'var(--text-primary,#e2e8f0)', fontFamily:"'IBM Plex Mono',monospace" }}>
      {/* Header */}
      <div style={{ marginBottom:'1.25rem' }}>
        <h1 style={{ margin:'0 0 0.3rem', fontSize:'1.3rem', fontWeight:700 }}>
          {isMedCanG && isPharma ? '🌿💊 MedCanG & Pharma' : isMedCanG ? '🌿 MedCanG' : '💊 Pharma-Compliance'}
        </h1>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          {isMedCanG && <span style={{ background:'#064e3b', color:'var(--success,#6ee7b7)', padding:'0.15rem 0.6rem', borderRadius:20, fontSize:'0.7rem' }}>● MedCanG aktiv</span>}
          {isPharma  && <span style={{ background:'var(--accent-hover,#1e3a8a)', color:'var(--accent-light,#93c5fd)', padding:'0.15rem 0.6rem', borderRadius:20, fontSize:'0.7rem' }}>● Pharma aktiv</span>}
        </div>
      </div>

      {msg && <div style={{ padding:'0.75rem 1rem', background:msg.ok?'#064e3b':'#450a0a', color:msg.ok?'var(--success,#6ee7b7)':'var(--danger,#fca5a5)', border:`1px solid ${msg.ok?'var(--success,#10b981)':'var(--danger,#ef4444)'}`, borderRadius:8, marginBottom:'1rem', fontSize:'0.85rem' }}>{msg.text}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.35rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {filteredTabellen.map(t => (
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{ borderRadius:8, padding:'0.45rem 0.9rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', fontWeight:500, background:activeTab===t.key?'var(--accent-hover,#1e3a8a)':'transparent', color:activeTab===t.key?'var(--accent-light,#93c5fd)':'var(--text-secondary,#64748b)', border:`1px solid ${activeTab===t.key?'var(--accent,#2563eb)':'var(--border,#2d3748)'}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign:'center', color:'var(--text-muted,#475569)', padding:'3rem' }}>Lade...</div> : (

      <>
      {/* ── Cannabis-Artikel ── */}
      {activeTab==='artikel' && (
        <div>
          <div style={{ color:'var(--text-muted,#475569)', fontSize:'0.78rem', marginBottom:'1rem' }}>
            Artikel mit MedCanG-relevanten Pflichtfeldern (PZN, THC, CBD, Sorte, Kategorie)
          </div>
          <div style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
              <thead><tr style={{ background:'var(--bg-primary,#0f1117)' }}>
                {['Artikelnr.','Bezeichnung','PZN','Kategorie','THC %','CBD %','Sorte','Bestand','BtM'].map(h=>(
                  <th key={h} style={{ padding:'0.65rem 0.85rem', textAlign:'left', color:'var(--text-muted,#475569)', fontWeight:600, fontSize:'0.65rem', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {artikel.filter(a => a.medcang_kategorie || a.btm_pflichtig).map(a => (
                  <tr key={a.id} style={{ borderTop:'1px solid var(--border,#1e293b)' }}>
                    <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--accent-light,#60a5fa)', fontSize:'0.75rem' }}>{a.artikelnr}</td>
                    <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-primary,#e2e8f0)', fontWeight:500 }}>{a.bezeichnung}</td>
                    <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--text-secondary,#94a3b8)' }}>{a.pzn||'–'}</td>
                    <td style={{ padding:'0.6rem 0.85rem' }}>
                      <span style={{ background:canvasFarbe(a)+'22', color:canvasFarbe(a), padding:'0.1rem 0.45rem', borderRadius:4, fontSize:'0.68rem' }}>
                        {a.medcang_kategorie||'–'}
                      </span>
                    </td>
                    <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--warning,#fbbf24)' }}>{a.thc_gehalt ? `${a.thc_gehalt}%` : '–'}</td>
                    <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--success,#6ee7b7)' }}>{a.cbd_gehalt ? `${a.cbd_gehalt}%` : '–'}</td>
                    <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-secondary,#94a3b8)' }}>{a.sorte||'–'}</td>
                    <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace' }}>{(a.bestand||0).toFixed(3)} {a.einheit}</td>
                    <td style={{ padding:'0.6rem 0.85rem' }}>
                      {a.btm_pflichtig ? <span style={{ color:'var(--danger,#ef4444)', fontWeight:700 }}>⚠️ BtM</span> : <span style={{ color:'var(--text-muted,#475569)' }}>–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {artikel.filter(a => a.medcang_kategorie || a.btm_pflichtig).length === 0 && (
              <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted,#374151)' }}>
                Keine Cannabis-Artikel — im Artikelstamm MedCanG-Felder befüllen
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chargen & CoA ── */}
      {activeTab==='chargen' && (
        <div>
          <div style={{ display:'grid', gap:'0.65rem' }}>
            {chargen.filter(c => c.artikel?.pzn || c.pzn || c.thc_analysiert != null).map(c => (
              <div key={c.id} style={{ background:'var(--bg-secondary,#1a1f2e)', border:`1px solid ${c.status==='freigegeben'?'var(--success,#059669)':c.status==='gesperrt'?'var(--danger,#dc2626)':'var(--border,#2d3748)'}`, borderRadius:10, padding:'1rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.5rem' }}>
                  <div>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.3rem' }}>
                      <span style={{ color:'var(--text-primary,#e2e8f0)', fontWeight:700, fontFamily:'monospace' }}>{c.charge_nr || c.chargennr}</span>
                      <span style={{ background:c.status==='freigegeben'?'#064e3b':c.status==='gesperrt'?'#450a0a':'var(--border,#1e293b)', color:c.status==='freigegeben'?'var(--success,#6ee7b7)':c.status==='gesperrt'?'var(--danger,#fca5a5)':'var(--text-secondary,#94a3b8)', padding:'0.1rem 0.45rem', borderRadius:4, fontSize:'0.68rem', fontWeight:600 }}>
                        {c.status}
                      </span>
                      {c.quarantaene && <span style={{ color:'var(--warning,#fbbf24)', fontSize:'0.72rem' }}>⚠️ Quarantäne</span>}
                    </div>
                    <div style={{ color:'var(--text-secondary,#64748b)', fontSize:'0.78rem' }}>{c.artikel?.bezeichnung}</div>
                    <div style={{ display:'flex', gap:'1.5rem', marginTop:'0.4rem', fontSize:'0.75rem', color:'var(--text-muted,#475569)', flexWrap:'wrap' }}>
                      {c.pzn && <span>PZN: <span style={{ color:'var(--text-primary,#e2e8f0)' }}>{c.pzn}</span></span>}
                      {c.thc_analysiert != null && <span>THC: <span style={{ color:'var(--warning,#fbbf24)' }}>{c.thc_analysiert}%</span></span>}
                      {c.cbd_analysiert != null && <span>CBD: <span style={{ color:'var(--success,#6ee7b7)' }}>{c.cbd_analysiert}%</span></span>}
                      {c.mhd && <span>MHD: <span style={{ color:new Date(c.mhd)<new Date()?'var(--danger,#ef4444)':'var(--text-primary,#e2e8f0)' }}>{new Date(c.mhd).toLocaleDateString('de-DE')}</span></span>}
                      {c.analysezertifikat_path && <span style={{ color:'var(--accent-light,#60a5fa)' }}>📄 CoA vorhanden</span>}
                    </div>
                  </div>
                  {hasRole('manager') && c.status === 'gesperrt' && (
                    <button onClick={()=>saveChargeStatus(c,'freigegeben')} style={{ background:'#064e3b', color:'var(--success,#6ee7b7)', border:'1px solid var(--success,#10b981)', borderRadius:8, padding:'0.4rem 0.85rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', fontWeight:600 }}>
                      ✓ Freigeben
                    </button>
                  )}
                  {hasRole('manager') && c.status === 'freigegeben' && (
                    <button onClick={()=>saveChargeStatus(c,'gesperrt')} style={{ background:'#450a0a', color:'var(--danger,#fca5a5)', border:'1px solid var(--danger,#dc2626)', borderRadius:8, padding:'0.4rem 0.85rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem' }}>
                      ⊗ Sperren
                    </button>
                  )}
                </div>
              </div>
            ))}
            {chargen.filter(c => c.artikel?.pzn || c.pzn || c.thc_analysiert != null).length === 0 && (
              <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted,#374151)', background:'var(--bg-secondary,#1a1f2e)', borderRadius:10, border:'1px solid var(--border,#2d3748)' }}>
                Keine MedCanG-Chargen mit Analysedaten — beim Anlegen PZN und THC/CBD-Werte eintragen
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Erlaubnisse ── */}
      {activeTab==='erlaubnisse' && (
        <div>
          <div style={{ color:'var(--text-muted,#475569)', fontSize:'0.78rem', marginBottom:'1rem' }}>Übersicht aller Partner-Erlaubnisse nach §3 MedCanG und §52a AMG</div>
          <div style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
              <thead><tr style={{ background:'var(--bg-primary,#0f1117)' }}>
                {['Partner','Typ','MedCanG-Erlaubnis','Gültig bis','BtM-Erlaubnis','Gültig bis','Status'].map(h=>(
                  <th key={h} style={{ padding:'0.65rem 0.85rem', textAlign:'left', color:'var(--text-muted,#475569)', fontWeight:600, fontSize:'0.65rem', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {partner.filter(p => p.medcang_erlaubnis || p.btm_erlaubnis || p.amg_herstellungserlaubnis).map(p => {
                  const heute = new Date()
                  const medGueltig = p.medcang_erlaubnis_gueltig ? new Date(p.medcang_erlaubnis_gueltig) > heute : null
                  const btmGueltig = p.btm_erlaubnis_gueltig    ? new Date(p.btm_erlaubnis_gueltig)    > heute : null
                  const bald30     = p.medcang_erlaubnis_gueltig ? (new Date(p.medcang_erlaubnis_gueltig) - heute) / 86400000 < 30 : false
                  return (
                    <tr key={p.id} style={{ borderTop:'1px solid var(--border,#1e293b)' }}>
                      <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-primary,#e2e8f0)', fontWeight:500 }}>{p.name}</td>
                      <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-secondary,#94a3b8)' }}>{p.typ}</td>
                      <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', fontSize:'0.75rem', color:'var(--text-secondary,#94a3b8)' }}>{p.medcang_erlaubnis||'–'}</td>
                      <td style={{ padding:'0.6rem 0.85rem' }}>
                        {p.medcang_erlaubnis_gueltig ? (
                          <span style={{ color:!medGueltig?'var(--danger,#ef4444)':bald30?'var(--warning,#fbbf24)':'var(--success,#10b981)', fontWeight:bald30||!medGueltig?700:400 }}>
                            {new Date(p.medcang_erlaubnis_gueltig).toLocaleDateString('de-DE')}
                            {!medGueltig && ' ⚠️'}
                            {bald30 && medGueltig && ' ⏰'}
                          </span>
                        ) : <span style={{ color:'var(--text-muted,#374151)' }}>–</span>}
                      </td>
                      <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', fontSize:'0.75rem', color:'var(--text-secondary,#94a3b8)' }}>{p.btm_erlaubnis||'–'}</td>
                      <td style={{ padding:'0.6rem 0.85rem' }}>
                        {p.btm_erlaubnis_gueltig ? (
                          <span style={{ color:!btmGueltig?'var(--danger,#ef4444)':'var(--success,#10b981)' }}>
                            {new Date(p.btm_erlaubnis_gueltig).toLocaleDateString('de-DE')}
                            {!btmGueltig && ' ⚠️'}
                          </span>
                        ) : <span style={{ color:'var(--text-muted,#374151)' }}>–</span>}
                      </td>
                      <td style={{ padding:'0.6rem 0.85rem' }}>
                        {medGueltig === null ? <span style={{ color:'var(--text-muted,#374151)' }}>Keine</span>
                        : medGueltig ? <span style={{ color:'var(--success,#10b981)', fontWeight:600 }}>✓ Gültig</span>
                        : <span style={{ color:'var(--danger,#ef4444)', fontWeight:700 }}>✗ Abgelaufen</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {partner.filter(p => p.medcang_erlaubnis || p.btm_erlaubnis).length === 0 && (
              <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted,#374151)' }}>Keine Erlaubnisse erfasst — im Partnerstamm eintragen</div>
            )}
          </div>
        </div>
      )}

      {/* ── Pharma-Artikel ── */}
      {activeTab==='pharma_art' && (
        <div>
          <div style={{ color:'var(--text-muted,#475569)', fontSize:'0.78rem', marginBottom:'1rem' }}>
            Artikel mit AMG-Zulassung, GMP-Klasse und weiteren Pharma-Pflichtfeldern
          </div>
          <div style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
              <thead><tr style={{ background:'var(--bg-primary,#0f1117)' }}>
                {['Artikelnr.','Bezeichnung','AMG-Zulassungsnr.','AMG-Kategorie','GMP-Klasse','Serialisierung','Temp-Klasse','MHD (Tage)'].map(h=>(
                  <th key={h} style={{ padding:'0.65rem 0.85rem', textAlign:'left', color:'var(--text-muted,#475569)', fontWeight:600, fontSize:'0.65rem', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {artikel.filter(a => a.amg_kategorie || a.amg_zulassungsnummer).map(a => (
                  <tr key={a.id} style={{ borderTop:'1px solid var(--border,#1e293b)' }}>
                    <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--accent-light,#60a5fa)', fontSize:'0.75rem' }}>{a.artikelnr}</td>
                    <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-primary,#e2e8f0)', fontWeight:500 }}>{a.bezeichnung}</td>
                    <td style={{ padding:'0.6rem 0.85rem', fontFamily:'monospace', color:'var(--text-secondary,#94a3b8)', fontSize:'0.75rem' }}>{a.amg_zulassungsnummer||'–'}</td>
                    <td style={{ padding:'0.6rem 0.85rem' }}>
                      <span style={{ background:'var(--accent-hover,#1e3a8a)22', color:'var(--accent-light,#60a5fa)', padding:'0.1rem 0.45rem', borderRadius:4, fontSize:'0.68rem' }}>
                        {a.amg_kategorie||'–'}
                      </span>
                    </td>
                    <td style={{ padding:'0.6rem 0.85rem', color:'var(--warning,#fbbf24)', fontWeight:700 }}>{a.gmp_klasse ? `GMP ${a.gmp_klasse}` : '–'}</td>
                    <td style={{ padding:'0.6rem 0.85rem' }}>{a.serialisierungspflichtig ? <span style={{ color:'var(--warning,#f97316)' }}>✓ Pflicht</span> : <span style={{ color:'var(--text-muted,#374151)' }}>–</span>}</td>
                    <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-secondary,#94a3b8)' }}>{a.temperaturklasse||'–'}</td>
                    <td style={{ padding:'0.6rem 0.85rem', color:'var(--text-secondary,#94a3b8)' }}>{a.haltbarkeit_tage ? `${a.haltbarkeit_tage} Tage` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {artikel.filter(a => a.amg_kategorie || a.amg_zulassungsnummer).length === 0 && (
              <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted,#374151)' }}>
                Keine Pharma-Artikel — im Artikelstamm AMG-Felder befüllen
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Regulatory / Vorschriften ── */}
      {(activeTab==='pharma_reg' || activeTab==='wiki') && (
        <div style={{ color:'var(--text-muted,#475569)', textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>📚</div>
          <div style={{ color:'var(--text-primary,#e2e8f0)', fontWeight:600, marginBottom:'0.5rem' }}>Regulatory Intelligence</div>
          <div style={{ fontSize:'0.82rem' }}>Vollständige Vorschriften-Datenbank im Pharma-Modul (💊 Pharma-Compliance in der Navigation)</div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
