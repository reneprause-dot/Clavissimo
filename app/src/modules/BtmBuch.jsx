/**
 * Clavissimo – BtM-Buch (§13 BtMVV)
 * Zeigt das unveränderliche Zugangs-/Abgangsbuch. Einträge selbst
 * können nicht bearbeitet/gelöscht werden (siehe RLS in
 * 07_rls_rollen.sql) — Fehler werden per Korrekturbuchung ausgeglichen,
 * die per storno_von auf den fehlerhaften Eintrag verweist.
 */
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function aktuellerMonat() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function BtmBuch() {
  const { hasRole, erpUser } = useAuth()
  const [eintraege, setEintraege] = useState([])
  const [artikelListe, setArtikelListe] = useState([])
  const [loading, setLoading] = useState(true)
  const [monat, setMonat] = useState(aktuellerMonat())
  const [artikelFilter, setArtikelFilter] = useState('')
  const [korrekturVon, setKorrekturVon] = useState(null)
  const [korrekturForm, setKorrekturForm] = useState({ typ: 'zugang', menge: '', grund: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000) }

  const load = async () => {
    setLoading(true)
    const sb = getSupabaseClient()
    const [jahr, mm] = monat.split('-')
    const von = `${jahr}-${mm}-01`
    const bis = new Date(Number(jahr), Number(mm), 0).toISOString().slice(0, 10)

    let query = sb.from('btm_buch')
      .select('*, artikel:artikel(artikelnr,bezeichnung,einheit), charge:chargen(chargennr), partner:geschaeftspartner(name), nutzer:erp_users(name)')
      .gte('datum', von).lte('datum', bis)
      .order('datum', { ascending: false }).order('created_at', { ascending: false })

    if (artikelFilter) query = query.eq('artikel_id', artikelFilter)

    const { data } = await query
    setEintraege(data || [])

    const { data: art } = await sb.from('artikel').select('id,artikelnr,bezeichnung').eq('btm_pflichtig', true).order('bezeichnung')
    setArtikelListe(art || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [monat, artikelFilter])

  const zugaengeGesamt = eintraege.filter(e => e.typ === 'zugang').reduce((s, e) => s + (parseFloat(e.menge) || 0), 0)
  const abgaengeGesamt = eintraege.filter(e => e.typ === 'abgang').reduce((s, e) => s + (parseFloat(e.menge) || 0), 0)

  const openKorrektur = (eintrag) => {
    setKorrekturVon(eintrag)
    setKorrekturForm({ typ: eintrag.typ === 'zugang' ? 'abgang' : 'zugang', menge: eintrag.menge, grund: '' })
  }

  const handleKorrektur = async () => {
    if (!korrekturForm.menge || !korrekturForm.grund.trim()) {
      showMsg(false, 'Menge und Begründung sind Pflichtfelder.'); return
    }
    setSaving(true)
    const sb = getSupabaseClient()
    const { error } = await sb.from('btm_buch').insert({
      typ: korrekturForm.typ,
      datum: new Date().toISOString().slice(0, 10),
      artikel_id: korrekturVon.artikel_id,
      charge_id: korrekturVon.charge_id,
      menge: parseFloat(korrekturForm.menge),
      einheit: korrekturVon.einheit,
      partner_id: korrekturVon.partner_id,
      belegnr: `KORREKTUR: ${korrekturForm.grund.trim()}`,
      bestand_nach: null, // wird nicht automatisch berechnet, da reine Korrekturbuchung ohne Warenbewegung
      gebucht_von: erpUser?.id,
      storno_von: korrekturVon.id,
    })
    setSaving(false)
    if (error) { showMsg(false, `Fehler: ${error.message}`); return }
    setKorrekturVon(null)
    showMsg(true, 'Korrekturbuchung angelegt.')
    load()
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary,#17241A)' }}>📕 BtM-Buch</h1>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <input type="month" value={monat} onChange={e => setMonat(e.target.value)} style={inp} />
          <select value={artikelFilter} onChange={e => setArtikelFilter(e.target.value)} style={inp}>
            <option value="">Alle Artikel</option>
            {artikelListe.map(a => <option key={a.id} value={a.id}>{a.bezeichnung} ({a.artikelnr})</option>)}
          </select>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '0.6rem 0.9rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1rem', background: msg.ok ? 'var(--success,#16A34A)18' : 'var(--danger,#B3261E)18', color: msg.ok ? 'var(--success,#16A34A)' : 'var(--danger,#B3261E)' }}>
          {msg.text}
        </div>
      )}

      {/* Monatssummen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={kachel}>
          <div style={kachelLabel}>Zugänge {monat}</div>
          <div style={{ ...kachelWert, color: 'var(--success,#16A34A)' }}>+{zugaengeGesamt.toLocaleString('de-DE')}</div>
        </div>
        <div style={kachel}>
          <div style={kachelLabel}>Abgänge {monat}</div>
          <div style={{ ...kachelWert, color: 'var(--danger,#B3261E)' }}>−{abgaengeGesamt.toLocaleString('de-DE')}</div>
        </div>
        <div style={kachel}>
          <div style={kachelLabel}>Saldo {monat}</div>
          <div style={kachelWert}>{(zugaengeGesamt - abgaengeGesamt).toLocaleString('de-DE')}</div>
        </div>
      </div>

      {/* Korrekturbuchungs-Modal */}
      {korrekturVon && (
        <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--warning,#B4650F)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--warning,#B4650F)' }}>Korrekturbuchung</h3>
          <p style={{ margin: '0 0 0.9rem', fontSize: '0.78rem', color: 'var(--text-muted,#748575)' }}>
            Gleicht Eintrag vom {new Date(korrekturVon.datum).toLocaleDateString('de-DE')} ({korrekturVon.typ}, {korrekturVon.menge} {korrekturVon.einheit}) aus.
            Der ursprüngliche Eintrag bleibt unverändert bestehen — so verlangt es die GoBD/BtMVV-Nachvollziehbarkeit.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={lbl}>Buchungstyp</label>
              <select value={korrekturForm.typ} onChange={e => setKorrekturForm({ ...korrekturForm, typ: e.target.value })} style={inp}>
                <option value="zugang">Zugang</option>
                <option value="abgang">Abgang</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Menge</label>
              <input type="number" step="0.001" value={korrekturForm.menge} onChange={e => setKorrekturForm({ ...korrekturForm, menge: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>Begründung *</label>
              <input value={korrekturForm.grund} onChange={e => setKorrekturForm({ ...korrekturForm, grund: e.target.value })} style={inp} placeholder="z.B. Zählfehler bei Inventur" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setKorrekturVon(null)} style={btnSecondary}>Abbrechen</button>
            <button onClick={handleKorrektur} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? 'Speichern...' : '✓ Korrektur buchen'}</button>
          </div>
        </div>
      )}

      {/* Buchungsliste */}
      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ background: 'var(--bg-primary,#F5F8F4)' }}>
              {['Datum', 'Typ', 'Artikel', 'Charge', 'Menge', 'Partner', 'Belegnr.', 'Bestand danach', 'Gebucht von', ''].map(h => (
                <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', color: 'var(--text-muted,#748575)', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted,#748575)' }}>Lade…</td></tr>
              : eintraege.length === 0 ? <tr><td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted,#748575)' }}>Keine Einträge in diesem Zeitraum</td></tr>
              : eintraege.map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid var(--border,#DCE6DC)', opacity: e.storno_von ? 0.85 : 1 }}>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary,#3E4E40)' }}>{new Date(e.datum).toLocaleDateString('de-DE')}</td>
                  <td style={{ padding: '0.6rem 1rem' }}>
                    <span style={{
                      padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                      background: e.typ === 'zugang' ? 'var(--success,#16A34A)18' : 'var(--danger,#B3261E)18',
                      color: e.typ === 'zugang' ? 'var(--success,#16A34A)' : 'var(--danger,#B3261E)',
                    }}>
                      {e.typ === 'zugang' ? '↓ Zugang' : '↑ Abgang'}
                    </span>
                    {e.storno_von && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: 'var(--warning,#B4650F)' }}>⚠ Korrektur</span>}
                  </td>
                  <td style={{ padding: '0.6rem 1rem', color: 'var(--text-primary,#17241A)' }}>{e.artikel?.bezeichnung}<div style={{ fontSize: '0.68rem', color: 'var(--text-muted,#748575)' }}>{e.artikel?.artikelnr}</div></td>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary,#3E4E40)' }}>{e.charge?.chargennr || '–'}</td>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary,#17241A)' }}>{e.menge} {e.einheit}</td>
                  <td style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary,#3E4E40)' }}>{e.partner?.name || '–'}</td>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted,#748575)' }}>{e.belegnr || '–'}</td>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary,#3E4E40)' }}>{e.bestand_nach ?? '–'}</td>
                  <td style={{ padding: '0.6rem 1rem', color: 'var(--text-muted,#748575)', fontSize: '0.75rem' }}>{e.nutzer?.name || '–'}</td>
                  <td style={{ padding: '0.6rem 1rem' }}>
                    {hasRole('manager') && !e.storno_von && (
                      <button onClick={() => openKorrektur(e)} title="Korrekturbuchung anlegen" style={btnMini}>↺ Korrigieren</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--text-muted,#748575)' }}>
        Einträge sind nach §13 BtMVV/GoBD unveränderlich — auch für Admins nicht bearbeit- oder löschbar.
        Fehler werden durch eine gegenläufige Korrekturbuchung ausgeglichen, die auf den Originaleintrag verweist.
      </p>
    </div>
  )
}

const lbl = { display: 'block', color: 'var(--text-muted,#748575)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }
const inp = { background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.5rem 0.7rem', color: 'var(--text-primary,#17241A)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }
const btnPrimary = { background: 'var(--accent,#16A34A)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600 }
const btnSecondary = { background: 'transparent', color: 'var(--text-secondary,#3E4E40)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.55rem 1.1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }
const btnMini = { background: 'transparent', border: '1px solid var(--warning,#B4650F)', color: 'var(--warning,#B4650F)', borderRadius: 6, padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'inherit', whiteSpace: 'nowrap' }
const kachel = { background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, padding: '1rem 1.2rem' }
const kachelLabel = { fontSize: '0.7rem', color: 'var(--text-muted,#748575)', textTransform: 'uppercase', marginBottom: '0.3rem' }
const kachelWert = { fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary,#17241A)' }
