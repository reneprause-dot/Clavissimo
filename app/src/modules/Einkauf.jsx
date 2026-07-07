import { useEffect, useState } from 'react'
import { heute, normDatum, normZeit, faelligAm, jetzt } from '../lib/zeitHelfer'
import BelegVorschau from '../components/BelegVorschau'
import { manuelleEinkaufsrechnungAnlegen } from '../lib/buchungslogik'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  einkaufBestellungAnlegen,
  einkaufWareneingangBuchen,
  einkaufRechnungBuchen,
  berechnePositionen
} from '../lib/buchungslogik'

const STATUS_INFO = {
  offen: { label: 'Offen', color: 'var(--accent,#2563eb)' },
  teilweise_geliefert: { label: 'Teil-Lieferung', color: '#d97706' },
  geliefert: { label: 'Geliefert', color: '#7c3aed' },
  berechnet: { label: 'Berechnet', color: 'var(--success,#059669)' },
  bezahlt: { label: 'Bezahlt', color: 'var(--success,#10b981)' },
  archiviert: { label: 'Archiviert', color: 'var(--text-muted,#475569)' },
  storniert: { label: 'Storniert', color: 'var(--danger,#dc2626)' }
}

const TYP_ICON = { bestellung: '📋', wareneingang: '📦', rechnung: '🧾', gutschrift: '↩️' }

function initPos() { return { artikel_id: '', bezeichnung: '', menge: '1', einheit: 'Stk', einzelpreis: '0', mwst_satz: '19' } }

export default function Einkauf() {
  const { erpUser, hasRole } = useAuth()
  const [belege, setBelege] = useState([])
  const [lieferanten, setLieferanten] = useState([])
  const [artikel, setArtikel] = useState([])
  const [offenePosten, setOffenePosten] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('bestellungen')
  const [modal, setModal] = useState(null) // null | 'bestellung' | 'wareneingang' | 'rechnung' | 'zahlung'
  const [selectedBeleg, setSelectedBeleg] = useState(null)
  const [form, setForm] = useState({})
  const [positionen, setPositionen] = useState([initPos()])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]               = useState(null)
  const [vorschauBeleg, setVorschauBeleg] = useState(null)
  const [zeigeManRechnung, setZeigeManRechnung] = useState(false)

  const load = async () => {
    const sb = getSupabaseClient()
    const [{ data: bel }, { data: lief }, { data: art }, { data: op }] = await Promise.all([
      sb.from('einkaufsbelege').select('*, lieferant:geschaeftspartner(id,name,zahlungsziel)').order('created_at', { ascending: false }).limit(200),
      sb.from('geschaeftspartner').select('id,name,zahlungsziel').in('typ', ['lieferant','beide']).eq('aktiv', true).order('name'),
      sb.from('artikel').select('id,artikelnr,bezeichnung,einkaufspreis,mwst_satz,einheit,bestand').eq('aktiv', true).order('bezeichnung'),
      sb.from('offene_posten').select('*, partner:geschaeftspartner(name)').eq('typ', 'kreditor').neq('status', 'ausgeglichen').order('faelligkeitsdatum')
    ])
    setBelege(bel || []); setLieferanten(lief || []); setArtikel(art || []); setOffenePosten(op || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updatePos = (idx, field, val) => {
    const neu = [...positionen]
    neu[idx] = { ...neu[idx], [field]: val }
    if (field === 'artikel_id') {
      const art = artikel.find(a => a.id === val)
      if (art) { neu[idx].bezeichnung = art.bezeichnung; neu[idx].einzelpreis = art.einkaufspreis?.toString(); neu[idx].mwst_satz = art.mwst_satz?.toString(); neu[idx].einheit = art.einheit }
    }
    setPositionen(neu)
  }

  const openModal = (type, beleg = null) => {
    setModal(type)
    setSelectedBeleg(beleg)
    setMsg(null)
    if (type === 'bestellung') {
      setForm({ lieferant_id: '', datum: heute() })
      setPositionen([initPos()])
    } else if (type === 'wareneingang') {
      setForm({ lieferdatum: heute(), lieferscheinnr: '' })
      // Positionen aus Bestellung vorausfüllen
      if (beleg?.positionen) setPositionen(beleg.positionen.map(p => ({ ...p, menge: p.menge.toString(), einzelpreis: p.einzelpreis.toString(), mwst_satz: p.mwst_satz.toString() })))
      else setPositionen([initPos()])
    } else if (type === 'rechnung') {
      setForm({ datum: heute(), lieferantenrechnungsnr: '', faelligkeitsdatum: '' })
      if (beleg?.positionen) setPositionen(beleg.positionen.map(p => ({ ...p, menge: (p.menge_geliefert || p.menge).toString(), einzelpreis: p.einzelpreis.toString(), mwst_satz: p.mwst_satz.toString() })))
      else setPositionen([initPos()])
    }
  }

  const loadBelegPositionen = async (belegId) => {
    const sb = getSupabaseClient()
    const { data } = await sb.from('einkauf_positionen').select('*, artikel:artikel(artikelnr,bezeichnung,bestand)').eq('beleg_id', belegId)
    return data || []
  }

  const handleBestellung = async () => {
    setSaving(true); setMsg(null)
    try {
      await einkaufBestellungAnlegen({ lieferant_id: form.lieferant_id, datum: form.datum, positionen, notizen: form.notizen, erstellt_von: erpUser?.id })
      setMsg({ ok: true, text: 'Bestellung angelegt. Buchung erfolgt erst beim Wareneingang.' })
      setTimeout(() => { setModal(null); load() }, 1500)
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  const handleWareneingang = async () => {
    setSaving(true); setMsg(null)
    try {
      const posMap = positionen.filter(p => p.bezeichnung || p.artikel_id)
      await einkaufWareneingangBuchen({ bestellung_id: selectedBeleg.id, lieferdatum: form.lieferdatum, lieferscheinnr: form.lieferscheinnr, positionen_geliefert: posMap, erstellt_von: erpUser?.id })
      setMsg({ ok: true, text: 'Wareneingang gebucht! Bestand erhöht, Bestellung archiviert.' })
      setTimeout(() => { setModal(null); load() }, 1800)
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  const handleRechnung = async () => {
    setSaving(true); setMsg(null)
    try {
      const { rechnung, op } = await einkaufRechnungBuchen({
        referenz_id: selectedBeleg.id,
        lieferantenrechnungsnr: form.lieferantenrechnungsnr,
        datum: form.datum,
        faelligkeitsdatum: form.faelligkeitsdatum || undefined,
        positionen,
        notizen: form.notizen,
        erstellt_von: erpUser?.id
      })
      setMsg({ ok: true, text: `Rechnung ${rechnung.belegnr} gebucht! Offener Posten € ${op.betrag.toFixed(2)} auf Kreditorenkonto angelegt.` })
      setTimeout(() => { setModal(null); load() }, 2000)
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  const gp = (p) => (parseFloat(p.menge) || 0) * (parseFloat(p.einzelpreis) || 0)
  const gesamtNetto = positionen.reduce((s, p) => s + gp(p), 0)
  const gesamtSteuer = positionen.reduce((s, p) => s + gp(p) * (parseFloat(p.mwst_satz) || 0) / 100, 0)

  const bestellungen = belege.filter(b => b.typ === 'bestellung')
  const wareneingaenge = belege.filter(b => b.typ === 'wareneingang')
  const rechnungen = belege.filter(b => b.typ === 'rechnung')
  const archiv = belege.filter(b => b.status === 'archiviert' || b.status === 'bezahlt')

  const ueberfaellig = offenePosten.filter(op => op.faelligkeitsdatum && new Date(op.faelligkeitsdatum) < new Date())

  return (
    <div style={{ padding: '1.5rem', color: 'var(--text-primary,#e2e8f0)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>🛒 Einkauf</h1>
        {hasRole('user') && (
          <button onClick={() => openModal('bestellung')} style={btnPrimary}>+ Neue Bestellung</button>
        )}
      </div>

      {/* Überfällige OP-Warnung */}
      {ueberfaellig.length > 0 && (
        <div style={{ background: '#431407', border: '1px solid var(--warning,#ea580c)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--warning,#fed7aa)' }}>
          ⚠️ <strong>{ueberfaellig.length} überfällige</strong> Kreditorenrechnungen – Gesamtbetrag: <strong>€ {ueberfaellig.reduce((s, o) => s + o.offen, 0).toFixed(2)}</strong>
        </div>
      )}

      {/* Workflow-Erklärung */}
      <div style={{ background: 'var(--bg-secondary,#1a1f2e)', border: '1px solid var(--border,#2d3748)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: 'var(--text-secondary,#64748b)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-primary,#e2e8f0)' }}>Workflow:</span>
        {['📋 Bestellung anlegen', '→', '📦 Wareneingang buchen', '→', '🧾 Eingangsrechnung buchen', '→', '💳 Zahlung ausgleichen'].map((s, i) => (
          <span key={i} style={{ color: s === '→' ? 'var(--text-muted,#374151)' : 'var(--text-secondary,#94a3b8)' }}>{s}</span>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[['bestellungen', `📋 Bestellungen (${bestellungen.filter(b=>b.status!=='archiviert').length})`],
          ['wareneingaenge', `📦 Wareneingänge (${wareneingaenge.length})`],
          ['rechnungen', `🧾 Rechnungen (${rechnungen.filter(b=>b.status!=='bezahlt').length})`],
          ['offene_posten', `⚡ Offene Posten (${offenePosten.length})`],
          ['archiv', `📁 Archiv (${archiv.length})`]
        ].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ borderRadius: 20, padding: '0.35rem 0.9rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', background: activeTab === key ? 'var(--accent,#2563eb)' : 'var(--bg-secondary,#1a1f2e)', color: activeTab === key ? '#fff' : 'var(--text-secondary,#64748b)', border: activeTab === key ? 'none' : '1px solid var(--border,#2d3748)' }}>{label}</button>
        ))}
      </div>

      {/* Bestellungen */}
      {activeTab === 'bestellungen' && (
        <BelegTabelle
          belege={bestellungen.filter(b => b.status !== 'archiviert')}
          loading={loading}
          onWareneingang={async (b) => {
            const pos = await loadBelegPositionen(b.id)
            openModal('wareneingang', { ...b, positionen: pos })
          }}
          onRechnung={async (b) => {
            const pos = await loadBelegPositionen(b.id)
            openModal('rechnung', { ...b, positionen: pos })
          }}
          hasRole={hasRole}
          showActions
        />
      )}

      {activeTab === 'wareneingaenge' && (
        <BelegTabelle
          belege={wareneingaenge}
          loading={loading}
          onRechnung={async (b) => {
            const pos = await loadBelegPositionen(b.id)
            openModal('rechnung', { ...b, positionen: pos })
          }}
          hasRole={hasRole}
          showRechnungAction
        />
      )}

      {activeTab === 'rechnungen' && (
        <BelegTabelle belege={rechnungen.filter(b => b.status !== 'bezahlt')} loading={loading} hasRole={hasRole} />
      )}

      {activeTab === 'offene_posten' && (
        <OffenePostenTabelle ops={offenePosten} />
      )}

      {activeTab === 'archiv' && (
        <BelegTabelle belege={archiv} loading={loading} hasRole={hasRole} isArchiv />
      )}

      {/* Modal */}
      {modal && (
        <Modal onClose={() => setModal(null)} title={
          modal === 'bestellung' ? '📋 Neue Bestellung' :
          modal === 'wareneingang' ? `📦 Wareneingang zu ${selectedBeleg?.belegnr}` :
          `🧾 Eingangsrechnung zu ${selectedBeleg?.belegnr}`
        }>
          {msg && <AlertBox ok={msg.ok} text={msg.text} />}

          {/* Kopfdaten */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {modal === 'bestellung' && <>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Lieferant *</label>
                <select value={form.lieferant_id || ''} onChange={e => setForm({ ...form, lieferant_id: e.target.value })} style={inp}>
                  <option value="">-- wählen --</option>
                  {lieferanten.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Bestelldatum</label><input type="date" value={form.datum || ''} onChange={e => setForm({ ...form, datum: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Notizen</label><input value={form.notizen || ''} onChange={e => setForm({ ...form, notizen: e.target.value })} style={inp} /></div>
            </>}

            {modal === 'wareneingang' && <>
              <div><label style={lbl}>Eingangsdatum *</label><input type="date" value={form.lieferdatum || ''} onChange={e => setForm({ ...form, lieferdatum: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Lieferscheinnr (Lieferant)</label><input value={form.lieferscheinnr || ''} onChange={e => setForm({ ...form, lieferscheinnr: e.target.value })} placeholder="Externe Nr." style={inp} /></div>
            </>}

            {modal === 'rechnung' && <>
              <div><label style={lbl}>Rechnungsdatum *</label><input type="date" value={form.datum || ''} onChange={e => setForm({ ...form, datum: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Lief.-Rechnungsnr.</label><input value={form.lieferantenrechnungsnr || ''} onChange={e => setForm({ ...form, lieferantenrechnungsnr: e.target.value })} placeholder="Externe Belegnr." style={inp} /></div>
              <div><label style={lbl}>Fälligkeit</label><input type="date" value={form.faelligkeitsdatum || ''} onChange={e => setForm({ ...form, faelligkeitsdatum: e.target.value })} style={inp} /></div>
            </>}
          </div>

          {/* Positionen */}
          <PositionenEditor positionen={positionen} setPositionen={setPositionen} artikel={artikel} updatePos={updatePos} readonly={modal === 'wareneingang'} />

          {/* Summen */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary,#94a3b8)' }}>Netto: <strong>€ {gesamtNetto.toFixed(2)}</strong></span>
            <span style={{ color: 'var(--text-secondary,#94a3b8)' }}>MwSt: <strong>€ {gesamtSteuer.toFixed(2)}</strong></span>
            <span style={{ color: 'var(--success,#10b981)', fontWeight: 700, fontSize: '1rem' }}>Brutto: € {(gesamtNetto + gesamtSteuer).toFixed(2)}</span>
          </div>

          {modal === 'rechnung' && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary,#0f1117)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-secondary,#94a3b8)' }}>
              💡 Buchung: <span style={{ color: 'var(--warning,#fbbf24)' }}>Soll 5000 Wareneinkauf + 1570 Vorsteuer</span> / <span style={{ color: 'var(--success,#34d399)' }}>Haben 1600 Verbindlichkeiten</span> → Offener Posten auf Kreditorenkonto
            </div>
          )}
          {modal === 'wareneingang' && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary,#0f1117)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-secondary,#94a3b8)' }}>
              💡 Artikelbestand wird erhöht. Buchung erfolgt erst mit der Eingangsrechnung.
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Abbrechen</button>
            <button onClick={modal === 'bestellung' ? handleBestellung : modal === 'wareneingang' ? handleWareneingang : handleRechnung}
              disabled={saving} style={btnPrimary}>
              {saving ? '⟳ Buchen...' : modal === 'bestellung' ? '📋 Bestellung speichern' : modal === 'wareneingang' ? '📦 Wareneingang buchen' : '🧾 Rechnung buchen + OP anlegen'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function BelegTabelle({ belege, loading, onWareneingang, onRechnung, hasRole, showActions, showRechnungAction, isArchiv }) {
  const canAct = hasRole && hasRole('user')
  return (
    <div style={{ background: 'var(--bg-secondary,#1a1f2e)', border: '1px solid var(--border,#2d3748)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead><tr style={{ background: 'var(--bg-primary,#0f1117)' }}>
            {['Belegnr.','Typ','Lieferant','Datum','Fälligkeit','Brutto','Status','Aktionen'].map(h => (
              <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted,#475569)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted,#475569)' }}>Lade...</td></tr>
            : belege.length === 0 ? <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted,#475569)' }}>Keine Einträge</td></tr>
            : belege.map(b => {
              const si = STATUS_INFO[b.status] || { label: b.status, color: 'var(--text-muted,#475569)' }
              const istUeberfaellig = b.faelligkeitsdatum && new Date(b.faelligkeitsdatum) < new Date() && b.status !== 'bezahlt' && b.status !== 'archiviert'
              return (
                <tr key={b.id} style={{ borderTop: '1px solid var(--border,#1e293b)', opacity: isArchiv ? 0.7 : 1 }}>
                  <td style={{ padding: '0.7rem 1rem' }}><span style={{ background: 'var(--border,#1e293b)', color: 'var(--accent-light,#93c5fd)', padding: '0.1rem 0.4rem', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.75rem' }}>{b.belegnr}</span></td>
                  <td style={{ padding: '0.7rem 1rem' }}>{TYP_ICON[b.typ]} <span style={{ color: 'var(--text-secondary,#94a3b8)', fontSize: '0.78rem' }}>{b.typ}</span></td>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-primary,#e2e8f0)' }}>{b.lieferant?.name || '–'}</td>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-secondary,#94a3b8)', whiteSpace: 'nowrap' }}>{b.datum ? new Date(b.datum).toLocaleDateString('de-DE') : '–'}</td>
                  <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap', color: istUeberfaellig ? 'var(--danger,#ef4444)' : 'var(--text-secondary,#64748b)' }}>{b.faelligkeitsdatum ? new Date(b.faelligkeitsdatum).toLocaleDateString('de-DE') : '–'}{istUeberfaellig && ' ⚠️'}</td>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--success,#10b981)', fontFamily: 'monospace', fontWeight: 600 }}>€ {(b.bruttobetrag || 0).toFixed(2)}</td>
                  <td style={{ padding: '0.7rem 1rem' }}><span style={{ background: si.color + '22', color: si.color, padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{si.label}</span></td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {canAct && showActions && b.status === 'offen' && onWareneingang && (
                        <button onClick={() => onWareneingang(b)} style={btnMini('#d97706')}>📦 Wareneingang</button>
                      )}
                      {canAct && showActions && ['offen','geliefert','teilweise_geliefert'].includes(b.status) && onRechnung && (
                        <button onClick={() => onRechnung(b)} style={btnMini('var(--accent,#2563eb)')}>🧾 Rechnung</button>
                      )}
                      {canAct && showRechnungAction && b.status === 'geliefert' && onRechnung && (
                        <button onClick={() => onRechnung(b)} style={btnMini('var(--accent,#2563eb)')}>🧾 Rechnung</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OffenePostenTabelle({ ops }) {
  const gesamt = ops.reduce((s, o) => s + o.offen, 0)
  return (
    <div>
      {ops.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary,#1a1f2e)', border: '1px solid var(--border,#2d3748)', borderRadius: 10, padding: '1rem' }}>
            <div style={{ color: 'var(--text-muted,#475569)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>OFFENE POSTEN</div>
            <div style={{ color: 'var(--danger,#ef4444)', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace' }}>€ {gesamt.toFixed(2)}</div>
          </div>
          <div style={{ background: 'var(--bg-secondary,#1a1f2e)', border: '1px solid var(--border,#2d3748)', borderRadius: 10, padding: '1rem' }}>
            <div style={{ color: 'var(--text-muted,#475569)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>ANZAHL</div>
            <div style={{ color: 'var(--text-primary,#e2e8f0)', fontSize: '1.4rem', fontWeight: 700 }}>{ops.length}</div>
          </div>
          <div style={{ background: 'var(--bg-secondary,#1a1f2e)', border: '1px solid var(--danger,#dc2626)', borderRadius: 10, padding: '1rem' }}>
            <div style={{ color: 'var(--text-muted,#475569)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>ÜBERFÄLLIG</div>
            <div style={{ color: 'var(--danger,#ef4444)', fontSize: '1.4rem', fontWeight: 700 }}>{ops.filter(o => new Date(o.faelligkeitsdatum) < new Date()).length}</div>
          </div>
        </div>
      )}
      <div style={{ background: 'var(--bg-secondary,#1a1f2e)', border: '1px solid var(--border,#2d3748)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead><tr style={{ background: 'var(--bg-primary,#0f1117)' }}>
            {['Belegnr.','Lieferant','Datum','Fälligkeit','Rechnungsbetrag','Noch offen','Status'].map(h => (
              <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted,#475569)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {ops.length === 0 ? <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted,#475569)' }}>Keine offenen Posten</td></tr>
            : ops.map(op => {
              const ueberfaellig = op.faelligkeitsdatum && new Date(op.faelligkeitsdatum) < new Date()
              return (
                <tr key={op.id} style={{ borderTop: '1px solid var(--border,#1e293b)', background: ueberfaellig ? '#450a0a22' : 'transparent' }}>
                  <td style={{ padding: '0.7rem 1rem' }}><span style={{ background: 'var(--border,#1e293b)', color: 'var(--accent-light,#93c5fd)', padding: '0.1rem 0.4rem', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.75rem' }}>{op.belegnr}</span></td>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-primary,#e2e8f0)' }}>{op.partner?.name}</td>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-secondary,#94a3b8)', whiteSpace: 'nowrap' }}>{new Date(op.datum).toLocaleDateString('de-DE')}</td>
                  <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap', color: ueberfaellig ? 'var(--danger,#ef4444)' : 'var(--text-secondary,#94a3b8)', fontWeight: ueberfaellig ? 600 : 400 }}>{op.faelligkeitsdatum ? new Date(op.faelligkeitsdatum).toLocaleDateString('de-DE') : '–'}{ueberfaellig && ' ⚠️'}</td>
                  <td style={{ padding: '0.7rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary,#94a3b8)' }}>€ {(op.betrag || 0).toFixed(2)}</td>
                  <td style={{ padding: '0.7rem 1rem', fontFamily: 'monospace', color: 'var(--danger,#ef4444)', fontWeight: 700 }}>€ {(op.offen || 0).toFixed(2)}</td>
                  <td style={{ padding: '0.7rem 1rem' }}><span style={{ background: '#450a0a', color: 'var(--danger,#fca5a5)', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.7rem' }}>{op.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PositionenEditor({ positionen, setPositionen, artikel, updatePos, readonly }) {
  return (
    <div style={{ background: 'var(--bg-primary,#0f1117)', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--text-secondary,#64748b)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Positionen</span>
        {!readonly && <button onClick={() => setPositionen([...positionen, initPos()])} style={{ ...btnSecondary, padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>+ Position</button>}
      </div>
      {positionen.map((p, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
          <div>
            {idx === 0 && <label style={lbl}>Artikel / Bezeichnung</label>}
            {readonly ? (
              <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-secondary,#1a1f2e)', borderRadius: 8, color: 'var(--text-primary,#e2e8f0)', fontSize: '0.85rem' }}>{p.bezeichnung}</div>
            ) : (
              <select value={p.artikel_id || ''} onChange={e => updatePos(idx, 'artikel_id', e.target.value)} style={{ ...inp, fontSize: '0.8rem' }}>
                <option value="">-- Artikel wählen --</option>
                {artikel.map(a => <option key={a.id} value={a.id}>{a.artikelnr} – {a.bezeichnung} (Bestand: {a.bestand})</option>)}
              </select>
            )}
          </div>
          <div>
            {idx === 0 && <label style={lbl}>Menge</label>}
            <input type="number" step="0.001" value={p.menge} onChange={e => !readonly && updatePos(idx, 'menge', e.target.value)} readOnly={readonly} style={{ ...inp, fontSize: '0.8rem', opacity: readonly ? 0.7 : 1 }} />
          </div>
          <div>
            {idx === 0 && <label style={lbl}>EK-Preis</label>}
            <input type="number" step="0.0001" value={p.einzelpreis} onChange={e => !readonly && updatePos(idx, 'einzelpreis', e.target.value)} readOnly={readonly} style={{ ...inp, fontSize: '0.8rem', opacity: readonly ? 0.7 : 1 }} />
          </div>
          <div>
            {idx === 0 && <label style={lbl}>MwSt</label>}
            <select value={p.mwst_satz} onChange={e => !readonly && updatePos(idx, 'mwst_satz', e.target.value)} disabled={readonly} style={{ ...inp, fontSize: '0.8rem' }}>
              <option value="19">19%</option><option value="7">7%</option><option value="0">0%</option>
            </select>
          </div>
          {!readonly && (
            <button onClick={() => setPositionen(positionen.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: 'var(--danger,#ef4444)', cursor: 'pointer', padding: '0.5rem', fontSize: '1rem', marginBottom: '0.1rem' }}>×</button>
          )}
        </div>
      ))}
    </div>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-secondary,#1a1f2e)', border: '1px solid var(--border,#2d3748)', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary,#e2e8f0)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary,#64748b)', cursor: 'pointer', fontSize: '1.3rem' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AlertBox({ ok, text }) {
  return <div style={{ padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', background: ok ? '#064e3b' : '#450a0a', color: ok ? 'var(--success,#6ee7b7)' : 'var(--danger,#fca5a5)', border: `1px solid ${ok ? 'var(--success,#10b981)' : 'var(--danger,#ef4444)'}`, fontSize: '0.85rem' }}>{text}</div>
}

// heute() → heute() aus zeitHelfer.js

const lbl = { display: 'block', color: 'var(--text-secondary,#64748b)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }
const inp = { width: '100%', background: 'var(--bg-primary,#0f1117)', border: '1px solid var(--border,#2d3748)', borderRadius: 8, padding: '0.6rem 0.75rem', color: 'var(--text-primary,#e2e8f0)', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
const btnPrimary = { background: 'var(--accent,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.25rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600 }
const btnSecondary = { background: 'transparent', color: 'var(--text-secondary,#94a3b8)', border: '1px solid var(--border,#2d3748)', borderRadius: 8, padding: '0.6rem 1.25rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }
const btnMini = (color) => ({ background: color + '22', border: `1px solid ${color}`, color, padding: '0.2rem 0.5rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit', whiteSpace: 'nowrap' })
