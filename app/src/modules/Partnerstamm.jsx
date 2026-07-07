import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { dbCall } from '../lib/dbHelper'
import { useAuth } from '../context/AuthContext'

export default function Partnerstamm() {
  const { hasRole } = useAuth()
  const [partner, setPartner] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('')
  const [typFilter, setTypFilter] = useState('alle')
  const [form, setForm] = useState(initForm())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000) }

  function initForm() {
    return {
      name: '', typ: 'kunde', email: '', kundennr: '', strasse: '', plz: '', ort: '',
      zahlungsziel: '14', skonto_prozent: '0', skonto_tage: '0',
      // MedCanG-Erlaubnisse
      medcang_erlaubnis: '', medcang_erlaubnis_gueltig: '', medcang_behoerde: '',
      btm_erlaubnis: '', btm_erlaubnis_gueltig: '', apotheken_ik: '',
      grosshandels_erlaubnis: '', amg_herstellungserlaubnis: '', amg_herstellungserlaubnis_gueltig: '',
      gdp_zertifikat: '', gdp_zertifikat_gueltig: '',
    }
  }

  const load = async () => {
    const sb = getSupabaseClient()
    const { data } = await dbCall(sb.from('geschaeftspartner').select('*').order('name'), 'Partnerstamm: geschaeftspartner')
    setPartner(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openEdit = (p) => {
    setEditing(p.id)
    setForm({
      ...initForm(), ...p,
      zahlungsziel: p.zahlungsziel?.toString() ?? '14',
      skonto_prozent: p.skonto_prozent?.toString() ?? '0',
      skonto_tage: p.skonto_tage?.toString() ?? '0',
    })
    setShowForm(true)
  }
  const openNew = () => { setEditing(null); setForm(initForm()); setShowForm(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { showMsg(false, 'Name ist Pflichtfeld.'); return }
    setSaving(true)
    const sb = getSupabaseClient()
    const leer = (v) => (v === '' ? null : v)
    const payload = {
      ...form,
      zahlungsziel: parseInt(form.zahlungsziel, 10) || 0,
      skonto_prozent: parseFloat(form.skonto_prozent) || 0,
      skonto_tage: parseInt(form.skonto_tage, 10) || 0,
      medcang_erlaubnis_gueltig: leer(form.medcang_erlaubnis_gueltig),
      btm_erlaubnis_gueltig: leer(form.btm_erlaubnis_gueltig),
      amg_herstellungserlaubnis_gueltig: leer(form.amg_herstellungserlaubnis_gueltig),
      gdp_zertifikat_gueltig: leer(form.gdp_zertifikat_gueltig),
    }
    const { error } = editing
      ? await sb.from('geschaeftspartner').update(payload).eq('id', editing)
      : await sb.from('geschaeftspartner').insert(payload)
    if (error) { showMsg(false, `Fehler: ${error.message}`); setSaving(false); return }
    setShowForm(false); load(); setSaving(false)
    showMsg(true, editing ? 'Partner aktualisiert.' : 'Partner angelegt.')
  }

  const toggleAktiv = async (p) => {
    const sb = getSupabaseClient()
    await sb.from('geschaeftspartner').update({ aktiv: !p.aktiv }).eq('id', p.id)
    load()
  }

  const heute = new Date().toISOString().slice(0, 10)
  const erlaubnisStatus = (p) => {
    const warnungen = []
    if (!p.medcang_erlaubnis_gueltig || p.medcang_erlaubnis_gueltig < heute) warnungen.push('MedCanG')
    if (!p.btm_erlaubnis_gueltig || p.btm_erlaubnis_gueltig < heute) warnungen.push('BtM')
    return warnungen
  }

  const filtered = partner
    .filter(p => typFilter === 'alle' || p.typ === typFilter)
    .filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase()) || p.kundennr?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div style={{ padding: '1.5rem' }}>
      {msg && <div style={{ margin:'0 0 1rem', padding:'0.65rem 1rem', borderRadius:8, fontSize:'0.82rem', background: msg.ok?'var(--success,#16A34A)18':'var(--danger,#B3261E)18', color: msg.ok?'var(--success,#16A34A)':'var(--danger,#B3261E)' }}>{msg.text}</div>}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'0.75rem' }}>
        <h1 style={{ margin:0, fontSize:'1.3rem', color:'var(--text-primary,#17241A)' }}>👥 Partnerstamm</h1>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Suchen..." style={searchStyle} />
          {hasRole('user') && <button onClick={openNew} style={btnPrimary}>+ Neuer Partner</button>}
        </div>
      </div>

      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
        {[['alle','Alle'],['kunde','Kunden'],['lieferant','Lieferanten'],['beide','Kunde & Lieferant']].map(([key,label]) => (
          <button key={key} onClick={()=>setTypFilter(key)} style={{ ...tabBtn, background: typFilter===key?'var(--accent,#16A34A)':'transparent', color: typFilter===key?'#fff':'var(--text-secondary,#3E4E40)', border: typFilter===key?'none':'1px solid var(--border,#DCE6DC)' }}>{label}</button>
        ))}
      </div>

      {showForm && (
        <div style={{ background:'var(--card-bg,#fff)', border:'1px solid var(--accent,#16A34A)', borderRadius:12, padding:'1.5rem', marginBottom:'1.5rem' }}>
          <h3 style={{ margin:'0 0 1.1rem', color:'var(--accent,#16A34A)', fontSize:'1rem' }}>{editing?'Partner bearbeiten':'Neuer Partner'}</h3>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'0.75rem' }}>
            <div style={{ gridColumn:'span 2' }}>
              <label style={lbl}>Name *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} />
            </div>
            <div>
              <label style={lbl}>Typ</label>
              <select value={form.typ} onChange={e=>setForm({...form,typ:e.target.value})} style={inp}>
                <option value="kunde">Kunde</option>
                <option value="lieferant">Lieferant</option>
                <option value="beide">Kunde &amp; Lieferant</option>
              </select>
            </div>
            {[['kundennr','Kundennr.'],['email','E-Mail'],['strasse','Straße'],['plz','PLZ'],['ort','Ort']].map(([field,label]) => (
              <div key={field}>
                <label style={lbl}>{label}</label>
                <input value={form[field]} onChange={e=>setForm({...form,[field]:e.target.value})} style={inp} />
              </div>
            ))}
            {[['zahlungsziel','Zahlungsziel (Tage)'],['skonto_prozent','Skonto (%)'],['skonto_tage','Skonto-Tage']].map(([field,label]) => (
              <div key={field}>
                <label style={lbl}>{label}</label>
                <input type="number" value={form[field]} onChange={e=>setForm({...form,[field]:e.target.value})} style={inp} />
              </div>
            ))}
          </div>

          {/* ── MedCanG-Erlaubnisse ────────────────────────────────── */}
          <div style={{ marginTop:'1.25rem', paddingTop:'1.1rem', borderTop:'1px dashed var(--border,#DCE6DC)' }}>
            <h4 style={{ margin:'0 0 0.75rem', fontSize:'0.85rem', color:'var(--success,#16A34A)' }}>🌿 MedCanG-Erlaubnisse</h4>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'0.75rem' }}>
              <div>
                <label style={lbl}>MedCanG-Erlaubnis (Nr.)</label>
                <input value={form.medcang_erlaubnis} onChange={e=>setForm({...form,medcang_erlaubnis:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>gültig bis</label>
                <input type="date" value={form.medcang_erlaubnis_gueltig||''} onChange={e=>setForm({...form,medcang_erlaubnis_gueltig:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>Ausstellende Behörde</label>
                <input value={form.medcang_behoerde} onChange={e=>setForm({...form,medcang_behoerde:e.target.value})} style={inp} />
              </div>

              <div>
                <label style={lbl}>BtM-Erlaubnis (Nr.)</label>
                <input value={form.btm_erlaubnis} onChange={e=>setForm({...form,btm_erlaubnis:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>gültig bis</label>
                <input type="date" value={form.btm_erlaubnis_gueltig||''} onChange={e=>setForm({...form,btm_erlaubnis_gueltig:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>Apotheken-IK</label>
                <input value={form.apotheken_ik} onChange={e=>setForm({...form,apotheken_ik:e.target.value})} style={inp} />
              </div>

              <div>
                <label style={lbl}>Großhandelserlaubnis (§52a AMG)</label>
                <input value={form.grosshandels_erlaubnis} onChange={e=>setForm({...form,grosshandels_erlaubnis:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>Herstellungserlaubnis (§13 AMG)</label>
                <input value={form.amg_herstellungserlaubnis} onChange={e=>setForm({...form,amg_herstellungserlaubnis:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>gültig bis</label>
                <input type="date" value={form.amg_herstellungserlaubnis_gueltig||''} onChange={e=>setForm({...form,amg_herstellungserlaubnis_gueltig:e.target.value})} style={inp} />
              </div>

              <div>
                <label style={lbl}>GDP-Zertifikat</label>
                <input value={form.gdp_zertifikat} onChange={e=>setForm({...form,gdp_zertifikat:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>gültig bis</label>
                <input type="date" value={form.gdp_zertifikat_gueltig||''} onChange={e=>setForm({...form,gdp_zertifikat_gueltig:e.target.value})} style={inp} />
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', marginTop:'1.25rem' }}>
            <button onClick={()=>setShowForm(false)} style={btnSecondary}>Abbrechen</button>
            <button onClick={handleSave} disabled={saving} style={btnPrimary}>{saving?'Speichern...':'✓ Speichern'}</button>
          </div>
        </div>
      )}

      <div style={{ background:'var(--card-bg,#fff)', border:'1px solid var(--border,#DCE6DC)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
            <thead><tr style={{ background:'var(--bg-primary,#F5F8F4)' }}>
              {['Name','Typ','Ort','Zahlungsziel','Erlaubnisse','Status',''].map(h => (
                <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', color:'var(--text-muted,#748575)', fontWeight:600, fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{padding:'3rem',textAlign:'center',color:'var(--text-muted,#748575)'}}>Lade...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} style={{padding:'3rem',textAlign:'center',color:'var(--text-muted,#748575)'}}>Keine Partner gefunden</td></tr>
              : filtered.map(p => {
                const warnungen = erlaubnisStatus(p)
                return (
                  <tr key={p.id} style={{ borderTop:'1px solid var(--border,#DCE6DC)', opacity: p.aktiv?1:0.45 }}>
                    <td style={{padding:'0.7rem 1rem',color:'var(--text-primary,#17241A)',fontWeight:500}}>{p.name}{p.kundennr&&<div style={{color:'var(--text-muted,#748575)',fontSize:'0.7rem',fontWeight:400}}>{p.kundennr}</div>}</td>
                    <td style={{padding:'0.7rem 1rem',color:'var(--text-secondary,#3E4E40)'}}>{p.typ==='kunde'?'Kunde':p.typ==='lieferant'?'Lieferant':'Kunde & Lieferant'}</td>
                    <td style={{padding:'0.7rem 1rem',color:'var(--text-secondary,#3E4E40)'}}>{p.ort||'–'}</td>
                    <td style={{padding:'0.7rem 1rem',color:'var(--text-secondary,#3E4E40)',fontFamily:'monospace'}}>{p.zahlungsziel} Tg.</td>
                    <td style={{padding:'0.7rem 1rem'}}>
                      {warnungen.length === 0
                        ? <span style={{ background:'var(--success,#16A34A)18', color:'var(--success,#16A34A)', padding:'0.1rem 0.5rem', borderRadius:4, fontSize:'0.68rem' }}>✓ OK</span>
                        : <span style={{ background:'var(--warning,#B4650F)18', color:'var(--warning,#B4650F)', padding:'0.1rem 0.5rem', borderRadius:4, fontSize:'0.68rem' }}>⚠️ {warnungen.join(', ')} fehlt/abgelaufen</span>}
                    </td>
                    <td style={{padding:'0.7rem 1rem'}}><span style={{background:p.aktiv?'var(--success,#16A34A)18':'var(--text-muted,#748575)18',color:p.aktiv?'var(--success,#16A34A)':'var(--text-muted,#748575)',padding:'0.1rem 0.5rem',borderRadius:4,fontSize:'0.7rem'}}>{p.aktiv?'Aktiv':'Inaktiv'}</span></td>
                    <td style={{padding:'0.7rem 1rem'}}>
                      {hasRole('user') && <div style={{display:'flex',gap:'0.4rem'}}>
                        <button onClick={()=>openEdit(p)} style={{...btnMini,color:'var(--accent,#16A34A)',borderColor:'var(--accent,#16A34A)'}}>✏️</button>
                        <button onClick={()=>toggleAktiv(p)} style={{...btnMini,color:'var(--text-secondary,#3E4E40)',borderColor:'var(--border,#DCE6DC)'}}>{p.aktiv?'⊗':'⊕'}</button>
                      </div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const lbl = { display:'block', color:'var(--text-muted,#748575)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.3rem' }
const inp = { width:'100%', background:'var(--input-bg,#F5F8F4)', border:'1px solid var(--border,#DCE6DC)', borderRadius:8, padding:'0.6rem 0.75rem', color:'var(--text-primary,#17241A)', fontSize:'0.85rem', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }
const searchStyle = { background:'var(--card-bg,#fff)', border:'1px solid var(--border,#DCE6DC)', borderRadius:8, padding:'0.5rem 0.75rem', color:'var(--text-primary,#17241A)', fontFamily:'inherit', fontSize:'0.8rem', outline:'none', width:200 }
const btnPrimary = { background:'var(--accent,#16A34A)', color:'#fff', border:'none', borderRadius:8, padding:'0.6rem 1.25rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:600 }
const btnSecondary = { background:'transparent', color:'var(--text-secondary,#3E4E40)', border:'1px solid var(--border,#DCE6DC)', borderRadius:8, padding:'0.6rem 1.25rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem' }
const btnMini = { background:'transparent', border:'1px solid', borderRadius:6, padding:'0.2rem 0.4rem', cursor:'pointer', fontSize:'0.75rem' }
const tabBtn = { borderRadius:8, padding:'0.5rem 1rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.8rem', fontWeight:500 }
