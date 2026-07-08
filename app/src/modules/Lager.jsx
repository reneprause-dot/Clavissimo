import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { dbCall } from '../lib/dbHelper'
import { useAuth } from '../context/AuthContext'
import { ladeOptionen, nurAktive } from '../lib/optionsListen'
import { logAudit } from '../lib/auditTrail'

export default function Lager() {
  const { hasRole, erpUser } = useAuth()
  const [artikel, setArtikel] = useState([])
  const [einheiten, setEinheiten] = useState([])
  const [kategorien, setKategorien] = useState([])
  const [sorten, setSorten] = useState([])
  const [medcangKategorien, setMedcangKategorien] = useState([])
  const [amgKategorien, setAmgKategorien] = useState([])
  const [gmpKlassen, setGmpKlassen] = useState([])
  const [temperaturklassen, setTemperaturklassen] = useState([])
  const [lagerorte, setLagerorte] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState(initForm())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000) }
  const [activeTab, setActiveTab] = useState('artikel')

  function initForm() {
    return {
      artikelnr: '', bezeichnung: '', beschreibung: '', einheit: 'Stk', kategorie: '',
      einkaufspreis: '', verkaufspreis: '', mwst_satz: '19', bestand: '0', mindestbestand: '0', lagerort: '',
      // MedCanG-Felder
      pzn: '', sorte: '', medcang_kategorie: '', amg_kategorie: '', amg_zulassungsnummer: '',
      gmp_klasse: '', temperaturklasse: '', thc_gehalt: '', cbd_gehalt: '', haltbarkeit_tage: '',
      btm_pflichtig: false, serialisierungspflichtig: false,
    }
  }

  const load = async () => {
    const sb = getSupabaseClient()
    const [artikelRes, einheitenRes, kat, sor, medcang, amg, gmp, temp, lo] = await Promise.all([
      dbCall(sb.from('artikel').select('*').order('artikelnr'), 'Lager: artikel'),
      dbCall(sb.from('einheiten').select('*').eq('aktiv', true).order('sortierung'), 'Lager: einheiten'),
      ladeOptionen('artikel_kategorien'),
      ladeOptionen('sorten'),
      ladeOptionen('medcang_kategorien'),
      ladeOptionen('amg_kategorien'),
      ladeOptionen('gmp_klassen'),
      ladeOptionen('temperaturklassen'),
      dbCall(sb.from('lagerorte').select('*').eq('aktiv', true).order('sortierung'), 'Lager: lagerorte'),
    ])
    setArtikel(artikelRes.data || [])
    setEinheiten(einheitenRes.data || [])
    setKategorien(nurAktive(kat))
    setSorten(nurAktive(sor))
    setMedcangKategorien(nurAktive(medcang))
    setAmgKategorien(nurAktive(amg))
    setGmpKlassen(nurAktive(gmp))
    setTemperaturklassen(nurAktive(temp))
    setLagerorte(lo.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openEdit = (art) => { setEditing(art.id); setForm({ ...initForm(), ...art, einkaufspreis: art.einkaufspreis?.toString(), verkaufspreis: art.verkaufspreis?.toString(), mwst_satz: art.mwst_satz?.toString(), bestand: art.bestand?.toString(), mindestbestand: art.mindestbestand?.toString(), thc_gehalt: art.thc_gehalt?.toString() ?? '', cbd_gehalt: art.cbd_gehalt?.toString() ?? '', haltbarkeit_tage: art.haltbarkeit_tage?.toString() ?? '' }); setShowForm(true) }
  const openNew = () => { setEditing(null); setForm(initForm()); setShowForm(true) }

  const handleSave = async () => {
    setSaving(true)
    const sb = getSupabaseClient()
    const payload = {
      ...form,
      einkaufspreis: parseFloat(form.einkaufspreis)||0, verkaufspreis: parseFloat(form.verkaufspreis)||0,
      mwst_satz: parseFloat(form.mwst_satz)||19, bestand: parseFloat(form.bestand)||0, mindestbestand: parseFloat(form.mindestbestand)||0,
      thc_gehalt: form.thc_gehalt === '' ? null : parseFloat(form.thc_gehalt),
      cbd_gehalt: form.cbd_gehalt === '' ? null : parseFloat(form.cbd_gehalt),
      haltbarkeit_tage: form.haltbarkeit_tage === '' ? null : parseInt(form.haltbarkeit_tage, 10),
    }
    if (editing) await sb.from('artikel').update(payload).eq('id', editing)
    else await sb.from('artikel').insert(payload)
    await logAudit(editing ? 'artikel_geaendert' : 'artikel_angelegt', {
      artikelId: editing || null, artikelnr: payload.artikelnr, bezeichnung: payload.bezeichnung, userId: erpUser?.id,
    })
    setShowForm(false); load(); setSaving(false)
  }

  const toggleAktiv = async (art) => {
    const sb = getSupabaseClient()
    await sb.from('artikel').update({ aktiv: !art.aktiv }).eq('id', art.id)
    load()
  }

  const filtered = artikel.filter(a => !filter || a.bezeichnung.toLowerCase().includes(filter.toLowerCase()) || a.artikelnr.toLowerCase().includes(filter.toLowerCase()))
  const niedrigBestand = artikel.filter(a => a.aktiv && a.bestand <= a.mindestbestand && a.mindestbestand > 0)

  return (
    <div style={{ padding: '1.5rem', color: 'var(--text-primary,#e2e8f0)' }}>
      {msg && <div style={{ margin:'0 1.5rem 1rem', padding:'0.65rem 1rem', borderRadius:8, fontSize:'0.82rem', background:msg.ok?'#064e3b':'#450a0a', border:`1px solid ${msg.ok?'var(--success,#10b981)':'var(--danger,#ef4444)'}`, color:msg.ok?'var(--success,#6ee7b7)':'var(--danger,#fca5a5)' }}>{msg.text}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>📦 Lager & Artikel</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Suchen..." style={searchStyle} />
          {hasRole('user') && <button onClick={openNew} style={btnPrimary}>+ Neuer Artikel</button>}
        </div>
      </div>

      {/* Warnbereich */}
      {niedrigBestand.length > 0 && (
        <div style={{ background: '#431407', border: '1px solid var(--warning,#ea580c)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--warning,#fed7aa)' }}>
          ⚠️ <strong>{niedrigBestand.length} Artikel</strong> unter Mindestbestand: {niedrigBestand.map(a => a.bezeichnung).join(', ')}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[['artikel','Artikelliste'],['bestand','Bestandsübersicht']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ ...tabBtn, background: activeTab===key?'var(--accent,#2563eb)':'transparent', color: activeTab===key?'#fff':'var(--text-secondary,#64748b)', border: activeTab===key?'none':'1px solid var(--border,#2d3748)' }}>{label}</button>
        ))}
      </div>

      {/* Neuer Artikel Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-secondary,#1a1f2e)', border: '1px solid var(--accent,#2563eb)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', color: 'var(--accent-light,#60a5fa)', fontSize: '1rem' }}>{editing ? 'Artikel bearbeiten' : 'Neuer Artikel'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {[['artikelnr','Artikelnummer *'],['bezeichnung','Bezeichnung *'],['beschreibung','Beschreibung']].map(([field, label]) => (
              <div key={field} style={field==='bezeichnung'||field==='beschreibung'?{gridColumn:'span 2'}:{}}>
                <label style={lbl}>{label}</label>
                <input value={form[field]} onChange={e => setForm({...form,[field]:e.target.value})} style={inp} />
              </div>
            ))}
            <div>
              <label style={lbl}>Lagerort</label>
              <select value={form.lagerort||''} onChange={e => setForm({...form, lagerort: e.target.value})} style={inp}>
                <option value="">– keine Auswahl –</option>
                {form.lagerort && !lagerorte.some(o=>o.bezeichnung===form.lagerort) && <option value={form.lagerort}>{form.lagerort} (inaktiv)</option>}
                {lagerorte.map(o => <option key={o.id} value={o.bezeichnung}>{o.bezeichnung}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Kategorie</label>
              <select value={form.kategorie} onChange={e => setForm({...form, kategorie: e.target.value})} style={inp}>
                <option value="">– keine Auswahl –</option>
                {form.kategorie && !kategorien.some(o=>o.bezeichnung===form.kategorie) && <option value={form.kategorie}>{form.kategorie} (inaktiv)</option>}
                  {kategorien.map(k => <option key={k.id} value={k.bezeichnung}>{k.bezeichnung}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Einheit</label>
              <select value={form.einheit} onChange={e => setForm({...form, einheit: e.target.value})} style={inp}>
                {einheiten.length === 0 && <option value={form.einheit}>{form.einheit}</option>}
                {einheiten.map(e => <option key={e.id} value={e.code}>{e.bezeichnung} ({e.code})</option>)}
              </select>
            </div>
            {[['einkaufspreis','Einkaufspreis (€)'],['verkaufspreis','Verkaufspreis (€)'],['mwst_satz','MwSt (%)'],['bestand','Aktueller Bestand'],['mindestbestand','Mindestbestand']].map(([field,label]) => (
              <div key={field}>
                <label style={lbl}>{label}</label>
                <input type="number" step="0.01" value={form[field]} onChange={e => setForm({...form,[field]:e.target.value})} style={inp} />
              </div>
            ))}
          </div>

          {/* ── MedCanG-Felder ─────────────────────────────────────── */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1.1rem', borderTop: '1px dashed var(--border,#2d3748)' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--success,#16A34A)' }}>🌿 MedCanG-Angaben</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={lbl}>PZN</label>
                <input value={form.pzn} onChange={e => setForm({...form, pzn: e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>Sorte</label>
                <select value={form.sorte} onChange={e => setForm({...form, sorte: e.target.value})} style={inp}>
                  <option value="">– keine Auswahl –</option>
                  {form.sorte && !sorten.some(o=>o.bezeichnung===form.sorte) && <option value={form.sorte}>{form.sorte} (inaktiv)</option>}
                  {sorten.map(o => <option key={o.id} value={o.bezeichnung}>{o.bezeichnung}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>MedCanG-Kategorie</label>
                <select value={form.medcang_kategorie} onChange={e => setForm({...form, medcang_kategorie: e.target.value})} style={inp}>
                  <option value="">– keine Auswahl –</option>
                  {form.medcang_kategorie && !medcangKategorien.some(o=>o.bezeichnung===form.medcang_kategorie) && <option value={form.medcang_kategorie}>{form.medcang_kategorie} (inaktiv)</option>}
                  {medcangKategorien.map(o => <option key={o.id} value={o.bezeichnung}>{o.bezeichnung}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>AMG-Kategorie</label>
                <select value={form.amg_kategorie} onChange={e => setForm({...form, amg_kategorie: e.target.value})} style={inp}>
                  <option value="">– keine Auswahl –</option>
                  {form.amg_kategorie && !amgKategorien.some(o=>o.bezeichnung===form.amg_kategorie) && <option value={form.amg_kategorie}>{form.amg_kategorie} (inaktiv)</option>}
                  {amgKategorien.map(o => <option key={o.id} value={o.bezeichnung}>{o.bezeichnung}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>AMG-Zulassungsnr.</label>
                <input value={form.amg_zulassungsnummer} onChange={e => setForm({...form, amg_zulassungsnummer: e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>GMP-Klasse</label>
                <select value={form.gmp_klasse} onChange={e => setForm({...form, gmp_klasse: e.target.value})} style={inp}>
                  <option value="">– keine Auswahl –</option>
                  {form.gmp_klasse && !gmpKlassen.some(o=>o.bezeichnung===form.gmp_klasse) && <option value={form.gmp_klasse}>{form.gmp_klasse} (inaktiv)</option>}
                  {gmpKlassen.map(o => <option key={o.id} value={o.bezeichnung}>{o.bezeichnung}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Temperaturklasse</label>
                <select value={form.temperaturklasse} onChange={e => setForm({...form, temperaturklasse: e.target.value})} style={inp}>
                  <option value="">– keine Auswahl –</option>
                  {form.temperaturklasse && !temperaturklassen.some(o=>o.bezeichnung===form.temperaturklasse) && <option value={form.temperaturklasse}>{form.temperaturklasse} (inaktiv)</option>}
                  {temperaturklassen.map(o => <option key={o.id} value={o.bezeichnung}>{o.bezeichnung}</option>)}
                </select>
              </div>
              {[['thc_gehalt','THC-Gehalt (%)'],['cbd_gehalt','CBD-Gehalt (%)'],['haltbarkeit_tage','Haltbarkeit (Tage)']].map(([field,label]) => (
                <div key={field}>
                  <label style={lbl}>{label}</label>
                  <input type="number" step="0.01" value={form[field]} onChange={e => setForm({...form,[field]:e.target.value})} style={inp} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.9rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary,#94a3b8)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.btm_pflichtig} onChange={e => setForm({...form, btm_pflichtig: e.target.checked})} />
                BtM-pflichtig
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary,#94a3b8)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.serialisierungspflichtig} onChange={e => setForm({...form, serialisierungspflichtig: e.target.checked})} />
                Serialisierungspflichtig
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button onClick={() => setShowForm(false)} style={btnSecondary}>Abbrechen</button>
            <button onClick={handleSave} disabled={saving} style={btnPrimary}>{saving?'Speichern...':'✓ Speichern'}</button>
          </div>
        </div>
      )}

      {activeTab === 'artikel' && (
        <div style={{ background: 'var(--bg-secondary,#1a1f2e)', border: '1px solid var(--border,#2d3748)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ background: 'var(--bg-primary,#0f1117)' }}>
                {['Nr.','Bezeichnung','Einheit','EK-Preis','VK-Preis','MwSt','Bestand','Mindest','Status',''].map(h => (
                  <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', color:'var(--text-muted,#475569)', fontWeight:600, fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={10} style={{padding:'3rem',textAlign:'center',color:'var(--text-muted,#475569)'}}>Lade...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={10} style={{padding:'3rem',textAlign:'center',color:'var(--text-muted,#475569)'}}>Keine Artikel gefunden</td></tr>
                : filtered.map(a => (
                  <tr key={a.id} style={{ borderTop:'1px solid var(--border,#1e293b)', opacity: a.aktiv?1:0.4 }}>
                    <td style={{padding:'0.7rem 1rem'}}><span style={{background:'var(--border,#1e293b)',color:'var(--text-secondary,#94a3b8)',padding:'0.1rem 0.4rem',borderRadius:4,fontFamily:'monospace',fontSize:'0.75rem'}}>{a.artikelnr}</span></td>
                    <td style={{padding:'0.7rem 1rem',color:'var(--text-primary,#e2e8f0)',maxWidth:200}}><div style={{fontWeight:500,display:'flex',alignItems:'center',gap:'0.4rem'}}>{a.bezeichnung}{a.btm_pflichtig&&<span title="BtM-pflichtig" style={{fontSize:'0.62rem',fontWeight:700,background:'var(--warning,#B4650F)22',color:'var(--warning,#B4650F)',padding:'0.05rem 0.35rem',borderRadius:4}}>BtM</span>}</div>{a.kategorie&&<div style={{color:'var(--text-muted,#475569)',fontSize:'0.7rem'}}>{a.kategorie}</div>}</td>
                    <td style={{padding:'0.7rem 1rem',color:'var(--text-secondary,#94a3b8)'}}>{a.einheit}</td>
                    <td style={{padding:'0.7rem 1rem',color:'var(--text-secondary,#94a3b8)',fontFamily:'monospace'}}>€ {(a.einkaufspreis||0).toFixed(2)}</td>
                    <td style={{padding:'0.7rem 1rem',color:'var(--success,#10b981)',fontFamily:'monospace',fontWeight:600}}>€ {(a.verkaufspreis||0).toFixed(2)}</td>
                    <td style={{padding:'0.7rem 1rem',color:'var(--text-secondary,#94a3b8)'}}>{a.mwst_satz}%</td>
                    <td style={{padding:'0.7rem 1rem',fontFamily:'monospace',color: a.bestand<=a.mindestbestand&&a.mindestbestand>0?'var(--danger,#ef4444)':'var(--text-primary,#e2e8f0)',fontWeight: a.bestand<=a.mindestbestand&&a.mindestbestand>0?700:400}}>{(a.bestand||0).toFixed(2)}</td>
                    <td style={{padding:'0.7rem 1rem',color:'var(--text-secondary,#64748b)',fontFamily:'monospace'}}>{(a.mindestbestand||0).toFixed(2)}</td>
                    <td style={{padding:'0.7rem 1rem'}}><span style={{background:a.aktiv?'#064e3b':'#1c1917',color:a.aktiv?'var(--success,#6ee7b7)':'#78716c',padding:'0.1rem 0.5rem',borderRadius:4,fontSize:'0.7rem'}}>{a.aktiv?'Aktiv':'Inaktiv'}</span></td>
                    <td style={{padding:'0.7rem 1rem'}}>
                      {hasRole('user') && <div style={{display:'flex',gap:'0.4rem'}}>
                        <button onClick={() => openEdit(a)} style={{...btnMini,color:'var(--accent-light,#60a5fa)',borderColor:'var(--accent-hover,#1e3a8a)'}}>✏️</button>
                        <button onClick={() => toggleAktiv(a)} style={{...btnMini,color:'var(--text-secondary,#94a3b8)',borderColor:'var(--text-muted,#374151)'}}>{a.aktiv?'⊗':'⊕'}</button>
                      </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bestand' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem' }}>
          {filtered.filter(a=>a.aktiv).map(a => (
            <div key={a.id} style={{ background:'var(--bg-secondary,#1a1f2e)', border:`1px solid ${a.bestand<=a.mindestbestand&&a.mindestbestand>0?'var(--danger,#dc2626)':'var(--border,#2d3748)'}`, borderRadius:10, padding:'1rem' }}>
              <div style={{fontWeight:600,color:'var(--text-primary,#e2e8f0)',marginBottom:'0.25rem'}}>{a.bezeichnung}</div>
              <div style={{color:'var(--text-muted,#475569)',fontSize:'0.75rem',marginBottom:'0.75rem'}}>{a.artikelnr}</div>
              <div style={{fontSize:'2rem',fontWeight:700,color:a.bestand<=a.mindestbestand&&a.mindestbestand>0?'var(--danger,#ef4444)':'var(--success,#10b981)'}}>{(a.bestand||0).toFixed(0)}</div>
              <div style={{color:'var(--text-muted,#475569)',fontSize:'0.75rem'}}>{a.einheit} · Mind.: {a.mindestbestand||0}</div>
              <div style={{marginTop:'0.5rem',height:4,background:'var(--border,#1e293b)',borderRadius:2}}>
                <div style={{width:`${Math.min(100,(a.bestand/(a.mindestbestand*2||1))*100)}%`,height:'100%',background:a.bestand<=a.mindestbestand&&a.mindestbestand>0?'var(--danger,#dc2626)':'var(--success,#10b981)',borderRadius:2,transition:'width 0.3s'}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const lbl = { display:'block', color:'var(--text-secondary,#64748b)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.3rem' }
const inp = { width:'100%', background:'var(--bg-primary,#0f1117)', border:'1px solid var(--border,#2d3748)', borderRadius:8, padding:'0.6rem 0.75rem', color:'var(--text-primary,#e2e8f0)', fontSize:'0.85rem', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }
const searchStyle = { background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:8, padding:'0.5rem 0.75rem', color:'var(--text-primary,#e2e8f0)', fontFamily:'inherit', fontSize:'0.8rem', outline:'none', width:200 }
const btnPrimary = { background:'var(--accent,#2563eb)', color:'#fff', border:'none', borderRadius:8, padding:'0.6rem 1.25rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:600 }
const btnSecondary = { background:'transparent', color:'var(--text-secondary,#94a3b8)', border:'1px solid var(--border,#2d3748)', borderRadius:8, padding:'0.6rem 1.25rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem' }
const btnMini = { background:'transparent', border:'1px solid', borderRadius:6, padding:'0.2rem 0.4rem', cursor:'pointer', fontSize:'0.75rem' }
const tabBtn = { borderRadius:8, padding:'0.5rem 1rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.8rem', fontWeight:500 }
