/**
 * Clavissimo – AppLayout (Header-Navigation)
 * Ersetzt die Sidebar durch eine Kopfzeile mit Dropdown-Kategorien,
 * damit der Hauptbereich die volle Bildschirmbreite/-höhe nutzt.
 * Gleiche Props wie das ursprüngliche Clavis-AppLayout:
 *   currentView, onNavigate, onSuche, children
 * -> Drop-in-Ersatz, keine Änderungen an App.jsx nötig.
 *
 * Navigation wird weiterhin automatisch aus MODUL_REGISTRY generiert.
 * Neue Module: nur in modulDefinitionen.js eintragen.
 */
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModules } from '../../context/ModuleContext'
import { MODUL_REGISTRY } from '../../lib/modulDefinitionen'
import BUILD_INFO from '../../lib/buildInfo'
import { ladeWartungsvertragBis, wartungsStatus, formatDatumDe } from '../../lib/wartungsvertrag'

// Nav-Gruppen automatisch aus Registry ableiten (identische Logik wie vorher)
function buildNavGruppen(isActive, hasRole) {
  const gruppenMap = new Map()

  for (const modul of MODUL_REGISTRY) {
    if (modul.key === 'dashboard') {
      if (!gruppenMap.has(null)) gruppenMap.set(null, [])
      gruppenMap.get(null).push(modul)
      continue
    }
    if (!modul.gruppe) continue
    if (!modul.kern) {
      if (!isActive(modul.key)) continue
    }
    if (modul.minRole && !hasRole(modul.minRole)) continue
    if (modul.adminOnly && !hasRole('admin')) continue

    if (!gruppenMap.has(modul.gruppe)) gruppenMap.set(modul.gruppe, [])
    gruppenMap.get(modul.gruppe).push(modul)
  }

  return [...gruppenMap.entries()].map(([label, items]) => ({ label, items }))
}

export default function AppLayout({ currentView, onNavigate, onSuche, children }) {
  const { erpUser, signOut, hasRole } = useAuth()
  const { isActive } = useModules()

  const [offeneKategorie, setOffeneKategorie] = useState(null)
  const [userMenuOffen, setUserMenuOffen] = useState(false)
  const [wartung, setWartung] = useState(null) // rein informativ, keine Sperre
  const headerRef = useRef(null)

  // Klick außerhalb schließt offene Dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setOffeneKategorie(null)
        setUserMenuOffen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Wartungsvertrag-Status laden — nur für Admins relevant, rein informativ,
  // beeinflusst nirgends die Funktionsfähigkeit der Software.
  useEffect(() => {
    if (!hasRole('admin')) return
    let mounted = true
    ladeWartungsvertragBis().then(datum => {
      if (mounted && datum) setWartung(wartungsStatus(datum))
    })
    return () => { mounted = false }
  }, [hasRole])

  // Dropdown schließen sobald navigiert wurde
  const navigiereUndSchliesse = (key) => {
    onNavigate(key)
    setOffeneKategorie(null)
  }

  const navGruppen = buildNavGruppen(isActive, hasRole)
  const dashboardGruppe = navGruppen.find(g => g.label === null)
  const kategorien = navGruppen.filter(g => g.label !== null && g.items.length > 0)

  // Aktuelles Modul für Breadcrumb/Titel im Header ermitteln
  const aktivesModul = MODUL_REGISTRY.find(m => m.key === currentView)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg-primary,#F5F8F4)', fontFamily:"'IBM Plex Mono',monospace", overflow:'hidden' }}>

      {/* ===== Header ===== */}
      <header ref={headerRef} style={{
        display:'flex', alignItems:'center', gap:'0.25rem',
        height:52, flexShrink:0, padding:'0 1rem',
        background:'var(--sidebar-bg,#123A22)',
        borderBottom:'2px solid var(--accent,#16A34A)',
        position:'relative', zIndex:100,
      }}>
        {/* Logo */}
        <button onClick={() => navigiereUndSchliesse('dashboard')} style={{
          display:'flex', alignItems:'center', gap:'0.5rem', background:'none', border:'none', cursor:'pointer',
          padding:'0.4rem 0.6rem', marginRight:'0.5rem', flexShrink:0,
        }}>
          <img src={`${import.meta.env.BASE_URL}clavis-logo.png`} alt="Clavissimo" style={{ width:26, height:26, objectFit:'contain', borderRadius:6 }} />
          <span style={{ color:'#EAF3EC', fontWeight:700, fontSize:'0.85rem', letterSpacing:'0.2px' }}>Clavissimo</span>
        </button>

        {/* Dashboard direkt anwählbar, falls vorhanden */}
        {dashboardGruppe?.items.map(item => (
          <button key={item.key} onClick={() => navigiereUndSchliesse(item.key)} style={{
            background: currentView===item.key ? 'rgba(255,255,255,0.12)' : 'transparent',
            border:'none', borderRadius:6, color: currentView===item.key ? '#fff' : '#CFE4D4',
            padding:'0.45rem 0.7rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', fontWeight:500,
            display:'flex', alignItems:'center', gap:'0.35rem',
          }}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}

        {/* Kategorien mit Dropdown */}
        <nav style={{ display:'flex', gap:'0.15rem', flex:1, position:'relative' }}>
          {kategorien.map(({ label, items }) => {
            const offen = offeneKategorie === label
            const hatAktives = items.some(i => i.key === currentView)
            return (
              <div key={label} style={{ position:'relative' }}>
                <button
                  onClick={() => setOffeneKategorie(offen ? null : label)}
                  style={{
                    display:'flex', alignItems:'center', gap:'0.35rem',
                    background: offen ? 'rgba(255,255,255,0.12)' : 'transparent',
                    border:'none', borderRadius:6, cursor:'pointer', fontFamily:'inherit',
                    padding:'0.45rem 0.7rem', fontSize:'0.78rem', fontWeight:500,
                    color: hatAktives ? '#7BE0A0' : '#CFE4D4',
                  }}
                >
                  {label}
                  <span style={{ fontSize:'0.55rem', opacity:0.7 }}>▾</span>
                </button>

                {offen && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 6px)', left:0, minWidth:220,
                    background:'var(--card-bg,#fff)', border:'1px solid var(--border,#DCE6DC)',
                    borderRadius:10, padding:6, boxShadow:'0 12px 30px rgba(18,58,34,0.18)', zIndex:200,
                  }}>
                    {items.map(item => (
                      <button key={item.key} onClick={() => navigiereUndSchliesse(item.key)} style={{
                        width:'100%', display:'flex', alignItems:'center', gap:'0.5rem',
                        justifyContent:'flex-start', textAlign:'left',
                        background: currentView===item.key ? 'var(--sidebar-active,#16A34A18)' : 'transparent',
                        border:'none', borderRadius:7, cursor:'pointer', fontFamily:'inherit',
                        padding:'0.5rem 0.6rem', fontSize:'0.78rem',
                        color: currentView===item.key ? 'var(--accent,#16A34A)' : 'var(--text-secondary,#3E4E40)',
                        fontWeight: currentView===item.key ? 600 : 400,
                      }}>
                        <span>{item.icon}</span>{item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Suche */}
        <button onClick={onSuche} style={{
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:7,
          padding:'0.4rem 0.7rem', color:'#9FC2AA', cursor:'pointer', fontFamily:'inherit', fontSize:'0.72rem',
          display:'flex', alignItems:'center', gap:'0.4rem', marginRight:'0.5rem',
        }}>
          🔍 Suchen <kbd style={{ background:'rgba(255,255,255,0.1)', padding:'0.05rem 0.3rem', borderRadius:4, fontSize:'0.6rem' }}>⌃K</kbd>
        </button>

        {/* Benutzer-Menü */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setUserMenuOffen(v => !v)} style={{
            width:30, height:30, borderRadius:'50%', background:'var(--accent,#16A34A)', border:'none',
            color:'#fff', fontWeight:700, fontSize:'0.7rem', cursor:'pointer',
          }}>
            {(erpUser?.name || erpUser?.email || '?').slice(0,2).toUpperCase()}
          </button>
          {userMenuOffen && (
            <div style={{
              position:'absolute', top:'calc(100% + 8px)', right:0, minWidth:180,
              background:'var(--card-bg,#fff)', border:'1px solid var(--border,#DCE6DC)',
              borderRadius:10, padding:8, boxShadow:'0 12px 30px rgba(18,58,34,0.18)', zIndex:200,
            }}>
              <div style={{ padding:'0.4rem 0.6rem', color:'var(--text-primary,#17241A)', fontSize:'0.78rem', fontWeight:600 }}>
                {erpUser?.name || erpUser?.email}
              </div>
              <div style={{ padding:'0 0.6rem 0.5rem', color:'var(--text-muted,#748575)', fontSize:'0.68rem' }}>
                {BUILD_INFO.version} · {BUILD_INFO.datum}
              </div>

              {/* Wartungsvertrag-Hinweis — rein informativ, keine Sperre.
                  Nur sichtbar wenn ein Enddatum hinterlegt ist. */}
              {hasRole('admin') && wartung && (
                <div style={{
                  margin:'0 0.6rem 0.5rem', padding:'0.4rem 0.5rem', borderRadius:7,
                  fontSize:'0.66rem', lineHeight:1.4,
                  background: wartung.status==='abgelaufen' ? 'var(--danger,#B3261E)11'
                            : wartung.status==='laeuft_bald_ab' ? 'var(--warning,#B4650F)11'
                            : 'var(--success,#16A34A)11',
                  color: wartung.status==='abgelaufen' ? 'var(--danger,#B3261E)'
                       : wartung.status==='laeuft_bald_ab' ? 'var(--warning,#B4650F)'
                       : 'var(--success,#16A34A)',
                }}>
                  {wartung.status==='abgelaufen' ? '⚠️ ' : wartung.status==='laeuft_bald_ab' ? '⏰ ' : '✓ '}
                  {wartung.label}
                </div>
              )}

              <button onClick={signOut} style={{
                width:'100%', textAlign:'left', background:'transparent', border:'none', borderRadius:7,
                padding:'0.5rem 0.6rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem',
                color:'var(--danger,#B3261E)',
              }}>
                🚪 Abmelden
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Optionale schmale Kontextzeile mit aktuellem Modul (Breadcrumb) */}
      {aktivesModul && aktivesModul.key !== 'dashboard' && (
        <div style={{
          height:34, flexShrink:0, display:'flex', alignItems:'center', gap:'0.5rem',
          padding:'0 1rem', background:'var(--bg-secondary,#fff)', borderBottom:'1px solid var(--border,#DCE6DC)',
          color:'var(--text-muted,#748575)', fontSize:'0.72rem',
        }}>
          <span>{aktivesModul.icon}</span>
          <span style={{ color:'var(--text-primary,#17241A)', fontWeight:600 }}>{aktivesModul.label}</span>
        </div>
      )}

      {/* ===== Hauptinhalt: volle Breite, keine Sidebar ===== */}
      <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
        {children}
      </div>
    </div>
  )
}
