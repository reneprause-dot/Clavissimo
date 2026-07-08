/**
 * Clavis ERP – MedCanG Branchenmodul
 * Medizinisches Cannabis B2B nach MedCanG (ab 01.04.2024)
 * Deaktivierung durch Admin nur möglich wenn keine Felder genutzt
 */
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// MedCanG Wiki Inhalte
const WIKI = [
  {
    titel: 'MedCanG – Überblick',
    inhalt: `Das Medizinal-Cannabisgesetz (MedCanG) trat am 01. April 2024 in Kraft und regelt den Umgang mit Cannabis zu medizinischen Zwecken in Deutschland.

**Wichtigste Regelungen für den B2B-Bereich:**
- Cannabis zu medizinischen Zwecken fällt weiterhin unter das Betäubungsmittelgesetz (BtMG)
- Großhändler benötigen eine Großhandelserlaubnis nach §52 AMG
- Hersteller benötigen eine Herstellungserlaubnis nach §13 AMG
- Apotheken dürfen nur von zugelassenen Großhändlern beziehen
- Vollständige Chargendokumentation und Rückverfolgbarkeit Pflicht

**Betroffene Produktkategorien:**
- Cannabis flos (Blüten) für medizinische Zwecke
- Cannabis extracts / Öle
- Fertigarzneimittel auf Cannabisbasis (z.B. Dronabinol, Sativex)`
  },
  {
    titel: 'Erlaubnisse & Behörden',
    inhalt: `**Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM)**
- Zuständig für Genehmigungen im Bereich medizinisches Cannabis
- Führt Register aller Erlaubnisinhaber
- Website: www.bfarm.de

**Benötigte Erlaubnisse für Großhändler:**
1. **Großhandelserlaubnis §52a AMG** – für den Handel mit Arzneimitteln
2. **BtM-Erlaubnis §3 BtMG** – für den Umgang mit Betäubungsmitteln  
3. **GDP-Zertifikat** – Good Distribution Practice Nachweis

**Erlaubnis-Überprüfung bei Kunden:**
- Apotheken: IK-Nummer + Apothekenerlaubnis
- Krankenhäuser: Betriebserlaubnis
- Andere Großhändler: §52a AMG Erlaubnis + BtM-Erlaubnis
- Gültigkeitsdaten müssen aktiv überwacht werden!

**Wichtig:** Verkauf an Personen ohne gültige Erlaubnis ist strafbar!`
  },
  {
    titel: 'Chargendokumentation',
    inhalt: `**Pflichtangaben pro Charge (§13 AMVV):**
- Chargennummer (eindeutig, rückverfolgbar)
- Hersteller und Herstellungsort
- Analyse-Zertifikat (CoA) mit THC/CBD-Gehalt
- MHD (Mindesthaltbarkeitsdatum)
- Lagerbedingungen
- Freigabedatum und freigebende Person

**Rückverfolgungspflicht:**
- Vollständiger Nachweis von Hersteller bis Patient
- Aufbewahrungspflicht: mindestens 5 Jahre
- Bei Rückruf: sofortige Meldung an BfArM

**Analysezertifikat (Certificate of Analysis – CoA):**
- THC-Gehalt (Grenzwert: je nach Produkt)
- CBD-Gehalt
- Pestizide / Schwermetalle / Mykotoxine
- Mikrobiologische Untersuchung
- Muss vom Lieferanten bereitgestellt werden`
  },
  {
    titel: 'Betäubungsmittel-Vorschriften',
    inhalt: `**BtM-Buchführungspflicht (§13 BtMVV):**
- Zugangsbuch: jeder Wareneingang mit Datum, Menge, Lieferant, Chargennr.
- Abgangsbuch: jede Abgabe mit Datum, Menge, Empfänger, Chargennr.
- Monatliche Bestandsabgleiche
- Jahresabschluss mit Meldung an zuständige Behörde

**Lagervorschriften:**
- Gesicherter, verschlossener Bereich (Tresor oder gesicherter Raum)
- Zugang nur für autorisiertes Personal
- Temperatur- und Feuchtigkeitsüberwachung
- Separierung von anderen Arzneimitteln

**Meldepflichten:**
- Diebstahl/Verlust: sofort an Polizei und BfArM
- Unregelmäßigkeiten: an zuständige Landesbehörde
- Jahresbericht: bis 31. Januar des Folgejahres`
  },
  {
    titel: 'GDP / Qualitätssicherung',
    inhalt: `**Good Distribution Practice (GDP-Leitlinien 2013/C 68/01):**
- Qualitätsmanagementsystem erforderlich
- Lieferantenqualifizierung vor erstem Bezug
- Temperaturvalidierung der Lieferkette (2-8°C oder 15-25°C je Produkt)
- Regelmäßige Selbstinspektionen
- Schulungsnachweise für alle Mitarbeiter

**Lieferantenqualifizierung:**
1. Kopie der Großhandelserlaubnis anfordern
2. BtM-Erlaubnis prüfen
3. GDP-Zertifikat prüfen
4. Qualifizierungsaudit (bei neuen Lieferanten)
5. Regelmäßige Wiederholungsprüfung (mind. jährlich)

**Reklamationsmanagement:**
- Jede Beanstandung dokumentieren
- Rückrufverfahren muss schriftlich definiert sein
- Meldung an Hersteller und BfArM wenn nötig`
  },
  {
    titel: 'Preisbildung & Erstattung',
    inhalt: `**Verordnungsfähigkeit:**
- Cannabis-Blüten und -Extrakte sind seit 2017 verordnungsfähig
- Kostenübernahme durch GKV nach §31 Abs. 6 SGB V
- Genehmigungspflicht der Krankenkasse (Ausnahmen möglich)

**Preisgestaltung im Großhandel:**
- Kein fixer Großhandelszuschlag für Cannabis (anders als bei anderen AM)
- Freie Preisgestaltung zwischen Hersteller und Großhändler
- Apotheken: Abgabepreis nach §5 AMPreisV

**Apothekenabgabepreis (vereinfacht):**
- Einkaufspreis + Apothekenaufschlag (3% min. €0,70 max. €35,94)
- + Festzuschlag €8,35
- + Kassenrabatt €-1,77
- + MwSt 19%

**Wichtig für Rechnungsstellung:**
- PZN (Pharmazentralnummer) Pflichtangabe
- Charge muss auf Lieferschein und Rechnung stehen
- Sonderregelungen für Betäubungsmittel beachten`
  },
]

export default function MedCanG({ onNavigate }) {
  const { erpUser, hasRole } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [wikiArtikel, setWikiArtikel] = useState(null)
  const [partner, setPartner] = useState([])
  const [artikel, setArtikel] = useState([])
  const [chargen, setChargen] = useState([])
  const [loading, setLoading] = useState(true)
  const [wikiSuche, setWikiSuche] = useState('')

  const load = async () => {
    const sb = getSupabaseClient()
    const [{ data: par }, { data: art }, { data: ch }] = await Promise.all([
      sb.from('geschaeftspartner').select('id,name,typ,medcang_erlaubnis,medcang_erlaubnis_gueltig,medcang_behoerde,btm_erlaubnis,btm_erlaubnis_gueltig,apotheken_ik').eq('aktiv',true).order('name'),
      sb.from('artikel').select('id,artikelnr,bezeichnung,pzn,btm_pflichtig,medcang_kategorie,thc_gehalt,cbd_gehalt,sorte').eq('aktiv',true).order('bezeichnung'),
      sb.from('chargen').select('*, artikel:artikel(bezeichnung,pzn)').order('created_at',{ascending:false}).limit(100),
    ])
    setPartner(par||[])
    setArtikel(art||[])
    setChargen(ch||[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const heute = new Date()
  const erlaubnisAbgelaufen = partner.filter(p => p.medcang_erlaubnis_gueltig && new Date(p.medcang_erlaubnis_gueltig) < heute)
  const erlaubnisBaldfaellig = partner.filter(p => p.medcang_erlaubnis_gueltig && new Date(p.medcang_erlaubnis_gueltig) > heute && (new Date(p.medcang_erlaubnis_gueltig)-heute) < 60*86400000)
  const ohneErlaubnis = partner.filter(p => ['kunde','beide'].includes(p.typ) && !p.medcang_erlaubnis)
  const artMitPZN = artikel.filter(a => a.pzn)
  const chargenOhneZertifikat = chargen.filter(c => !c.analysezertifikat_path)
  const filteredWiki = WIKI.filter(w => !wikiSuche || w.titel.toLowerCase().includes(wikiSuche.toLowerCase()) || w.inhalt.toLowerCase().includes(wikiSuche.toLowerCase()))

  const tabs = [
    ['dashboard','🌿 Übersicht'],
    ['erlaubnisse','📋 Erlaubnisüberwachung'],
    ['artikel','💊 Cannabis-Artikel'],
    ['chargen','🏷️ Chargenübersicht'],
    ['wiki','📚 MedCanG Wiki'],
  ]

  return (
    <div style={{ padding:'1.5rem', color:'var(--text-primary,#e2e8f0)', fontFamily:"'IBM Plex Mono',monospace" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.3rem', fontWeight:700 }}>🌿 MedCanG – Medizinisches Cannabis</h1>
          <span style={{ fontSize:'0.75rem', color:'#7c3aed' }}>B2B Großhandel · MedCanG / BtMG · GDP-konform</span>
        </div>
      </div>

      <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {tabs.map(([k,l])=>(
          <button key={k} onClick={()=>{setActiveTab(k);setWikiArtikel(null)}} style={{ borderRadius:8, padding:'0.45rem 0.9rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', fontWeight:500, background:activeTab===k?'#7c3aed':'transparent', color:activeTab===k?'#fff':'var(--text-secondary,#64748b)', border:activeTab===k?'none':'1px solid var(--border,#2d3748)' }}>{l}</button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab==='dashboard' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
            {[
              {l:'Cannabis-Artikel (PZN)', v:artMitPZN.length, c:'#7c3aed'},
              {l:'Aktive Partner', v:partner.length, c:'var(--success,#10b981)'},
              {l:'Erlaubnisse abgelaufen', v:erlaubnisAbgelaufen.length, c:erlaubnisAbgelaufen.length>0?'var(--danger,#ef4444)':'var(--text-muted,#475569)'},
              {l:'Erlaubnisse bald fällig', v:erlaubnisBaldfaellig.length, c:erlaubnisBaldfaellig.length>0?'var(--warning,#fbbf24)':'var(--text-muted,#475569)'},
              {l:'Ohne Erlaubnis (Kunden)', v:ohneErlaubnis.length, c:ohneErlaubnis.length>0?'var(--danger,#ef4444)':'var(--text-muted,#475569)'},
              {l:'Chargen ohne CoA', v:chargenOhneZertifikat.length, c:chargenOhneZertifikat.length>0?'var(--warning,#f97316)':'var(--text-muted,#475569)'},
            ].map(k=>(
              <div key={k.l} style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:10, padding:'1rem' }}>
                <div style={{ color:'var(--text-muted,#475569)', fontSize:'0.65rem', textTransform:'uppercase', marginBottom:'0.4rem' }}>{k.l}</div>
                <div style={{ color:k.c, fontSize:'1.5rem', fontWeight:700 }}>{k.v}</div>
              </div>
            ))}
          </div>

          {erlaubnisAbgelaufen.length > 0 && (
            <div style={{ background:'#450a0a', border:'1px solid var(--danger,#dc2626)', borderRadius:10, padding:'1rem', marginBottom:'1rem' }}>
              <div style={{ color:'var(--danger,#fca5a5)', fontWeight:700, marginBottom:'0.75rem' }}>🚨 ABGELAUFENE ERLAUBNISSE – Kein Verkauf erlaubt!</div>
              {erlaubnisAbgelaufen.map(p=>(
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'0.3rem 0', fontSize:'0.82rem', borderTop:'1px solid #7f1d1d' }}>
                  <span style={{ color:'var(--danger,#fca5a5)' }}>{p.name}</span>
                  <span style={{ color:'var(--danger,#ef4444)', fontFamily:'monospace' }}>abgelaufen: {new Date(p.medcang_erlaubnis_gueltig).toLocaleDateString('de-DE')}</span>
                </div>
              ))}
            </div>
          )}

          {erlaubnisBaldfaellig.length > 0 && (
            <div style={{ background:'#431407', border:'1px solid #d97706', borderRadius:10, padding:'1rem' }}>
              <div style={{ color:'var(--warning,#fbbf24)', fontWeight:700, marginBottom:'0.75rem' }}>⏰ Erlaubnisse laufen in &lt;60 Tagen ab</div>
              {erlaubnisBaldfaellig.map(p=>(
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'0.3rem 0', fontSize:'0.82rem', borderTop:'1px solid #78350f' }}>
                  <span style={{ color:'var(--warning,#fed7aa)' }}>{p.name}</span>
                  <span style={{ color:'var(--warning,#fbbf24)', fontFamily:'monospace' }}>bis: {new Date(p.medcang_erlaubnis_gueltig).toLocaleDateString('de-DE')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ERLAUBNISÜBERWACHUNG */}
      {activeTab==='erlaubnisse' && (
        <div style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
            <thead><tr style={{ background:'var(--bg-primary,#0f1117)' }}>
              {['Partner','Typ','MedCanG-Erlaubnis','Gültig bis','BtM-Erlaubnis','BtM gültig bis','Behörde','IK-Nummer','Status'].map(h=>(
                <th key={h} style={{ padding:'0.75rem 0.9rem', textAlign:'left', color:'var(--text-muted,#475569)', fontWeight:600, fontSize:'0.65rem', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {partner.length===0 ? <tr><td colSpan={9} style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted,#475569)' }}>Keine Geschäftspartner vorhanden</td></tr>
              : partner.map(p=>{
                const abgelaufen = p.medcang_erlaubnis_gueltig && new Date(p.medcang_erlaubnis_gueltig) < heute
                const bald = p.medcang_erlaubnis_gueltig && !abgelaufen && (new Date(p.medcang_erlaubnis_gueltig)-heute) < 60*86400000
                return (
                  <tr key={p.id} style={{ borderTop:'1px solid var(--border,#1e293b)', background:abgelaufen?'#450a0a22':bald?'#43140722':'transparent' }}>
                    <td style={{ padding:'0.65rem 0.9rem', color:'var(--text-primary,#e2e8f0)', fontWeight:500 }}>{p.name}</td>
                    <td style={{ padding:'0.65rem 0.9rem' }}><span style={{ background:'var(--border,#1e293b)', color:'var(--text-secondary,#94a3b8)', padding:'0.1rem 0.4rem', borderRadius:4, fontSize:'0.7rem' }}>{p.typ}</span></td>
                    <td style={{ padding:'0.65rem 0.9rem', color:p.medcang_erlaubnis?'var(--success,#10b981)':'var(--danger,#ef4444)', fontFamily:'monospace', fontSize:'0.75rem' }}>{p.medcang_erlaubnis||'⚠️ Fehlt'}</td>
                    <td style={{ padding:'0.65rem 0.9rem', color:abgelaufen?'var(--danger,#ef4444)':bald?'var(--warning,#fbbf24)':'var(--text-secondary,#94a3b8)', whiteSpace:'nowrap', fontWeight:abgelaufen||bald?700:400 }}>
                      {p.medcang_erlaubnis_gueltig?new Date(p.medcang_erlaubnis_gueltig).toLocaleDateString('de-DE'):'–'}
                      {abgelaufen?' 🚨':bald?' ⏰':''}
                    </td>
                    <td style={{ padding:'0.65rem 0.9rem', color:p.btm_erlaubnis?'var(--success,#10b981)':'var(--text-muted,#475569)', fontSize:'0.75rem' }}>{p.btm_erlaubnis||'–'}</td>
                    <td style={{ padding:'0.65rem 0.9rem', color:'var(--text-secondary,#94a3b8)', whiteSpace:'nowrap', fontSize:'0.75rem' }}>{p.btm_erlaubnis_gueltig?new Date(p.btm_erlaubnis_gueltig).toLocaleDateString('de-DE'):'–'}</td>
                    <td style={{ padding:'0.65rem 0.9rem', color:'var(--text-secondary,#64748b)', fontSize:'0.75rem' }}>{p.medcang_behoerde||'–'}</td>
                    <td style={{ padding:'0.65rem 0.9rem', color:'var(--text-secondary,#64748b)', fontFamily:'monospace', fontSize:'0.75rem' }}>{p.apotheken_ik||'–'}</td>
                    <td style={{ padding:'0.65rem 0.9rem' }}>
                      <span style={{ background:abgelaufen?'#450a0a':(!p.medcang_erlaubnis?'#1c1917':'#064e3b'), color:abgelaufen?'var(--danger,#fca5a5)':(!p.medcang_erlaubnis?'#78716c':'var(--success,#6ee7b7)'), padding:'0.15rem 0.5rem', borderRadius:4, fontSize:'0.68rem' }}>
                        {abgelaufen?'🚨 Abgelaufen':(!p.medcang_erlaubnis?'⚠️ Keine Erl.':'✓ OK')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ARTIKEL */}
      {activeTab==='artikel' && (
        <div style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
            <thead><tr style={{ background:'var(--bg-primary,#0f1117)' }}>
              {['Artikelnr.','Bezeichnung','PZN','Kategorie','Sorte','THC %','CBD %','BtM-pflichtig'].map(h=>(
                <th key={h} style={{ padding:'0.75rem 0.9rem', textAlign:'left', color:'var(--text-muted,#475569)', fontWeight:600, fontSize:'0.65rem', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {artikel.length===0 ? <tr><td colSpan={8} style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted,#475569)' }}>Keine Artikel mit MedCanG-Feldern vorhanden</td></tr>
              : artikel.map(a=>(
                <tr key={a.id} style={{ borderTop:'1px solid var(--border,#1e293b)' }}>
                  <td style={{ padding:'0.65rem 0.9rem' }}><span style={{ background:'var(--border,#1e293b)', color:'var(--accent-light,#93c5fd)', padding:'0.1rem 0.4rem', borderRadius:4, fontFamily:'monospace', fontSize:'0.75rem' }}>{a.artikelnr}</span></td>
                  <td style={{ padding:'0.65rem 0.9rem', color:'var(--text-primary,#e2e8f0)', fontWeight:500 }}>{a.bezeichnung}</td>
                  <td style={{ padding:'0.65rem 0.9rem', color:a.pzn?'#a78bfa':'var(--text-muted,#475569)', fontFamily:'monospace', fontSize:'0.78rem' }}>{a.pzn||'–'}</td>
                  <td style={{ padding:'0.65rem 0.9rem', color:'var(--text-secondary,#94a3b8)' }}>{a.medcang_kategorie||'–'}</td>
                  <td style={{ padding:'0.65rem 0.9rem', color:'var(--text-secondary,#94a3b8)' }}>{a.sorte||'–'}</td>
                  <td style={{ padding:'0.65rem 0.9rem', color:'var(--warning,#fbbf24)', fontFamily:'monospace' }}>{a.thc_gehalt!=null?`${a.thc_gehalt}%`:'–'}</td>
                  <td style={{ padding:'0.65rem 0.9rem', color:'var(--success,#34d399)', fontFamily:'monospace' }}>{a.cbd_gehalt!=null?`${a.cbd_gehalt}%`:'–'}</td>
                  <td style={{ padding:'0.65rem 0.9rem' }}><span style={{ color:a.btm_pflichtig?'var(--danger,#ef4444)':'var(--text-muted,#475569)' }}>{a.btm_pflichtig?'🔴 Ja':'–'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CHARGEN */}
      {activeTab==='chargen' && (
        <div style={{ background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
            <thead><tr style={{ background:'var(--bg-primary,#0f1117)' }}>
              {['Charge','Artikel','PZN','Bestand','MHD','THC','CBD','CoA','Status'].map(h=>(
                <th key={h} style={{ padding:'0.75rem 0.9rem', textAlign:'left', color:'var(--text-muted,#475569)', fontWeight:600, fontSize:'0.65rem', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {chargen.length===0 ? <tr><td colSpan={9} style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted,#475569)' }}>Keine Chargen vorhanden</td></tr>
              : chargen.map(c=>{
                const abgelaufen = c.mhd && new Date(c.mhd) < heute
                return (
                  <tr key={c.id} style={{ borderTop:'1px solid var(--border,#1e293b)', background:c.gesperrt?'#450a0a22':'transparent' }}>
                    <td style={{ padding:'0.6rem 0.9rem' }}><span style={{ color:'var(--warning,#fbbf24)', fontFamily:'monospace', fontSize:'0.78rem', fontWeight:600 }}>{c.chargennr}</span></td>
                    <td style={{ padding:'0.6rem 0.9rem', color:'var(--text-primary,#e2e8f0)' }}>{c.artikel?.bezeichnung}</td>
                    <td style={{ padding:'0.6rem 0.9rem', color:'#a78bfa', fontFamily:'monospace', fontSize:'0.75rem' }}>{c.pzn||c.artikel?.pzn||'–'}</td>
                    <td style={{ padding:'0.6rem 0.9rem', color:'var(--success,#10b981)', fontFamily:'monospace' }}>{(c.bestand||0).toFixed(3)}</td>
                    <td style={{ padding:'0.6rem 0.9rem', color:abgelaufen?'var(--danger,#ef4444)':'var(--text-secondary,#94a3b8)', whiteSpace:'nowrap' }}>{c.mhd?new Date(c.mhd).toLocaleDateString('de-DE'):'–'}{abgelaufen?' ⚠️':''}</td>
                    <td style={{ padding:'0.6rem 0.9rem', color:'var(--warning,#fbbf24)', fontFamily:'monospace' }}>{c.thc_analysiert!=null?`${c.thc_analysiert}%`:'–'}</td>
                    <td style={{ padding:'0.6rem 0.9rem', color:'var(--success,#34d399)', fontFamily:'monospace' }}>{c.cbd_analysiert!=null?`${c.cbd_analysiert}%`:'–'}</td>
                    <td style={{ padding:'0.6rem 0.9rem' }}><span style={{ color:c.analysezertifikat_path?'var(--success,#10b981)':'var(--danger,#ef4444)' }}>{c.analysezertifikat_path?'✓ Vorhanden':'⚠️ Fehlt'}</span></td>
                    <td style={{ padding:'0.6rem 0.9rem' }}><span style={{ background:c.gesperrt?'#450a0a':'#064e3b', color:c.gesperrt?'var(--danger,#fca5a5)':'var(--success,#6ee7b7)', padding:'0.1rem 0.4rem', borderRadius:4, fontSize:'0.68rem' }}>{c.gesperrt?'🔒 Gesperrt':'✓ OK'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* WIKI */}
      {activeTab==='wiki' && (
        <div style={{ display:'flex', gap:'1.5rem', height:'calc(100vh - 220px)' }}>
          {/* Sidebar */}
          <div style={{ width:260, background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:12, display:'flex', flexDirection:'column', flexShrink:0 }}>
            <div style={{ padding:'0.75rem' }}>
              <input value={wikiSuche} onChange={e=>setWikiSuche(e.target.value)} placeholder="Wiki durchsuchen..."
                style={{ width:'100%', background:'var(--bg-primary,#0f1117)', border:'1px solid var(--border,#2d3748)', borderRadius:8, padding:'0.5rem 0.65rem', color:'var(--text-primary,#e2e8f0)', fontFamily:'inherit', fontSize:'0.78rem', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ flex:1, overflow:'auto' }}>
              {filteredWiki.map((w,i)=>(
                <button key={i} onClick={()=>setWikiArtikel(w)}
                  style={{ width:'100%', padding:'0.75rem 1rem', background:wikiArtikel?.titel===w.titel?'#7c3aed18':'transparent', border:'none', borderLeft:wikiArtikel?.titel===w.titel?'3px solid #7c3aed':'3px solid transparent', color:wikiArtikel?.titel===w.titel?'#a78bfa':'var(--text-secondary,#94a3b8)', cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:'0.8rem', borderBottom:'1px solid var(--border,#1e293b)' }}>
                  📄 {w.titel}
                </button>
              ))}
            </div>
          </div>

          {/* Inhalt */}
          <div style={{ flex:1, background:'var(--bg-secondary,#1a1f2e)', border:'1px solid var(--border,#2d3748)', borderRadius:12, padding:'1.5rem', overflow:'auto' }}>
            {!wikiArtikel ? (
              <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted,#475569)' }}>
                <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📚</div>
                <div>Artikel aus dem Wiki wählen</div>
                <div style={{ fontSize:'0.78rem', marginTop:'0.5rem' }}>MedCanG, BtMG, GDP, Erlaubnisse, Chargendokumentation</div>
              </div>
            ) : (
              <div>
                <h2 style={{ margin:'0 0 1.5rem', color:'#a78bfa', fontSize:'1.2rem' }}>{wikiArtikel.titel}</h2>
                <div style={{ color:'var(--text-secondary,#94a3b8)', lineHeight:1.8, fontSize:'0.88rem', whiteSpace:'pre-wrap' }}>
                  {wikiArtikel.inhalt.split('\n').map((zeile, i) => {
                    if (zeile.startsWith('**') && zeile.endsWith('**')) {
                      return <div key={i} style={{ color:'var(--text-primary,#e2e8f0)', fontWeight:700, marginTop:'1rem', marginBottom:'0.3rem' }}>{zeile.replace(/\*\*/g,'')}</div>
                    }
                    if (zeile.startsWith('- ')) {
                      return <div key={i} style={{ paddingLeft:'1rem', color:'var(--text-secondary,#94a3b8)' }}>• {zeile.slice(2)}</div>
                    }
                    if (zeile.match(/^\d+\./)) {
                      return <div key={i} style={{ paddingLeft:'1rem', color:'var(--text-secondary,#94a3b8)' }}>{zeile}</div>
                    }
                    return <div key={i}>{zeile}</div>
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
