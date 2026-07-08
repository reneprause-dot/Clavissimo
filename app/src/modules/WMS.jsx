/**
 * Clavissimo – WMS (Lagerverwaltung)
 * Tab 1: Lagerorte anlegen/pflegen (CRUD, wird von Lager.jsx und der
 *        Chargen-Anlage in MedCanGPharma.jsx als Dropdown genutzt).
 * Tab 2: Bestandsübersicht je Lagerort — Artikel (nach freiem Lagerort-
 *        Textfeld) und Chargen (nach echter lagerort_id-Referenz).
 */
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TYPEN = [
  { value: 'standard', label: 'Standard' },
  { value: 'kuehlraum', label: 'Kühlraum' },
  { value: 'tresor', label: 'Tresor / verschließbar' },
  { value: 'quarantaene', label: 'Quarantäne' },
]

export default function WMS() {
  const { hasRole } = useAuth()
  const [activeTab, setActiveTab] = useState('bestand')
  const [lagerorte, setLagerorte] = useState([])
  const [artikel, setArtikel] = useState([])
  const [chargen, setChargen] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', bezeichnung: '', typ: 'standard' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000) }

  const load = async () => {
    setLoading(true)
    const sb = getSupabaseClient()
    const [{ data: lo }, { data: art }, { data: ch }] = await Promise.all([
      sb.from('lagerorte').select('*').order('sortierung'),
      sb.from('artikel').select('id,artikelnr,bezeichnung,bestand,einheit,lagerort').eq('aktiv', true).not('lagerort', 'is', null).order('lagerort'),
      sb.from('chargen').select('id,chargennr,bestand,mhd,status,lagerort_id,artikel:artikel(bezeichnung,artikelnr)').gt('bestand', 0).order('chargennr'),
    ])
    setLagerorte(lo || [])
    setArtikel(art || [])
    setChargen(ch || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleAnlegen = async () => {
    if (!form.code.trim() || !form.bezeichnung.trim()) { showMsg(false, 'Code und Bezeichnung sind Pflichtfelder.'); return }
    setSaving(true)
    const sb = getSupabaseClient()
    const { error } = await sb.from('lagerorte').insert({ code: form.code.trim(), bezeichnung: form.bezeichnung.trim(), typ: form.typ })
    setSaving(false)
    if (error) { showMsg(false, `Fehler: ${error.message}`); return }
    setForm({ code: '', bezeichnung: '', typ: 'standard' })
    showMsg(true, 'Lagerort angelegt.')
    load()
  }

  const toggleAktiv = async (lo) => {
    const sb = getSupabaseClient()
    await sb.from('lagerorte').update({ aktiv: !lo.aktiv }).eq('id', lo.id)
    load()
  }

  // Bestand nach Lagerort gruppieren (Artikel per Freitext-Match auf bezeichnung,
  // Chargen per echter lagerort_id — beide Wege existieren parallel, siehe Kommentar oben)
  const gruppen = lagerorte.map(lo => ({
    lagerort: lo,
    artikel: artikel.filter(a => a.lagerort === lo.bezeichnung),
    chargen: chargen.filter(c => c.lagerort_id === lo.id),
  })).filter(g => g.artikel.length > 0 || g.chargen.length > 0)

  const ohneLagerort = {
    artikel: artikel.filter(a => !lagerorte.some(lo => lo.bezeichnung === a.lagerort)),
    chargen: chargen.filter(c => !c.lagerort_id),
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary,#17241A)' }}>📍 Lagerverwaltung (WMS)</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[['bestand', 'Bestand je Lagerort'], ['lagerorte', 'Lagerorte verwalten']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              borderRadius: 20, padding: '0.4rem 1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', border: 'none',
              background: activeTab === key ? 'var(--accent,#16A34A)' : 'var(--card-bg,#fff)',
              color: activeTab === key ? '#fff' : 'var(--text-secondary,#3E4E40)',
              boxShadow: activeTab === key ? 'none' : 'inset 0 0 0 1px var(--border,#DCE6DC)',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ padding: '0.6rem 0.9rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1rem', background: msg.ok ? 'var(--success,#16A34A)18' : 'var(--danger,#B3261E)18', color: msg.ok ? 'var(--success,#16A34A)' : 'var(--danger,#B3261E)' }}>
          {msg.text}
        </div>
      )}

      {activeTab === 'lagerorte' && (
        <>
          {hasRole('user') && (
            <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--accent,#16A34A)', borderRadius: 12, padding: '1.1rem 1.25rem', marginBottom: '1.25rem', maxWidth: 560 }}>
              <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.9rem', color: 'var(--accent,#16A34A)' }}>Neuer Lagerort</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
                <div><label style={lbl}>Code</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} style={inp} placeholder="z.B. KR-A-7" /></div>
                <div><label style={lbl}>Bezeichnung</label><input value={form.bezeichnung} onChange={e => setForm({ ...form, bezeichnung: e.target.value })} style={inp} placeholder="z.B. Kühlraum A / Fach 7" /></div>
                <div><label style={lbl}>Typ</label>
                  <select value={form.typ} onChange={e => setForm({ ...form, typ: e.target.value })} style={inp}>
                    {TYPEN.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleAnlegen} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? 'Speichern...' : '+ Anlegen'}</button>
            </div>
          )}

          <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: 'var(--bg-primary,#F5F8F4)' }}>
                {['Code', 'Bezeichnung', 'Typ', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', color: 'var(--text-muted,#748575)', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted,#748575)' }}>Lade…</td></tr>
                : lagerorte.map(lo => (
                  <tr key={lo.id} style={{ borderTop: '1px solid var(--border,#DCE6DC)', opacity: lo.aktiv ? 1 : 0.5 }}>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary,#3E4E40)' }}>{lo.code}</td>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-primary,#17241A)' }}>{lo.bezeichnung}</td>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary,#3E4E40)' }}>{TYPEN.find(t => t.value === lo.typ)?.label || lo.typ}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ background: lo.aktiv ? 'var(--success,#16A34A)18' : 'var(--text-muted,#748575)18', color: lo.aktiv ? 'var(--success,#16A34A)' : 'var(--text-muted,#748575)', padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.7rem' }}>
                        {lo.aktiv ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      {hasRole('user') && <button onClick={() => toggleAktiv(lo)} style={btnMini}>{lo.aktiv ? '⊗' : '⊕'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'bestand' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? <div style={{ color: 'var(--text-muted,#748575)' }}>Lade…</div>
          : gruppen.length === 0 && ohneLagerort.artikel.length === 0 && ohneLagerort.chargen.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted,#748575)', background: 'var(--card-bg,#fff)', borderRadius: 12 }}>
              Noch keine Bestände einem Lagerort zugeordnet.
            </div>
          ) : (
            <>
              {gruppen.map(g => (
                <div key={g.lagerort.id} style={card}>
                  <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-primary,#17241A)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📍 {g.lagerort.bezeichnung}
                    <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--text-muted,#748575)' }}>({g.lagerort.code})</span>
                  </h3>
                  {g.artikel.map(a => (
                    <div key={a.id} style={zeile}>
                      <span>{a.bezeichnung} <span style={{ color: 'var(--text-muted,#748575)', fontSize: '0.72rem' }}>({a.artikelnr})</span></span>
                      <span style={{ fontFamily: 'monospace' }}>{a.bestand} {a.einheit}</span>
                    </div>
                  ))}
                  {g.chargen.map(c => (
                    <div key={c.id} style={{ ...zeile, background: 'var(--success,#16A34A)08' }}>
                      <span>🏷️ {c.artikel?.bezeichnung} <span style={{ color: 'var(--text-muted,#748575)', fontSize: '0.72rem', fontFamily: 'monospace' }}>Charge {c.chargennr}</span></span>
                      <span style={{ fontFamily: 'monospace' }}>{c.bestand} {c.mhd && `· MHD ${new Date(c.mhd).toLocaleDateString('de-DE')}`}</span>
                    </div>
                  ))}
                </div>
              ))}

              {(ohneLagerort.artikel.length > 0 || ohneLagerort.chargen.length > 0) && (
                <div style={{ ...card, borderStyle: 'dashed' }}>
                  <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted,#748575)' }}>⚠️ Ohne zugeordneten Lagerort</h3>
                  {ohneLagerort.artikel.map(a => (
                    <div key={a.id} style={zeile}>
                      <span>{a.bezeichnung} <span style={{ color: 'var(--text-muted,#748575)', fontSize: '0.72rem' }}>({a.artikelnr})</span></span>
                      <span style={{ fontFamily: 'monospace' }}>{a.bestand} {a.einheit}</span>
                    </div>
                  ))}
                  {ohneLagerort.chargen.map(c => (
                    <div key={c.id} style={zeile}>
                      <span>🏷️ {c.artikel?.bezeichnung} <span style={{ color: 'var(--text-muted,#748575)', fontSize: '0.72rem', fontFamily: 'monospace' }}>Charge {c.chargennr}</span></span>
                      <span style={{ fontFamily: 'monospace' }}>{c.bestand}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const lbl = { display: 'block', color: 'var(--text-muted,#748575)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }
const inp = { width: '100%', boxSizing: 'border-box', background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.55rem 0.7rem', color: 'var(--text-primary,#17241A)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }
const btnPrimary = { background: 'var(--accent,#16A34A)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600 }
const btnMini = { background: 'transparent', border: '1px solid var(--border,#DCE6DC)', color: 'var(--text-secondary,#3E4E40)', borderRadius: 6, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.78rem' }
const card = { background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, padding: '1.1rem 1.25rem' }
const zeile = { display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 0.6rem', color: 'var(--text-secondary,#3E4E40)', borderRadius: 6 }
