/**
 * Clavissimo – ModuleContext
 * Bewusst einfach gehalten (kein Lizenzsystem wie bei Clavis ERP):
 *
 *   - Kernmodule (kern: true in modulDefinitionen.js) sind IMMER aktiv.
 *   - Optionale Module (eQMS, Personal, DATEV, GoBD) kann ein Admin
 *     global ein-/ausschalten — gespeichert in der Tabelle `erp_module`.
 *
 * Kein Lizenzschlüssel, keine Kunden-ID, keine Ablaufdaten, kein
 * Pro-User-Modulzugang. Wer Zugriff auf Clavissimo hat, sieht alle
 * aktiven Module — feingranulare Rechte laufen weiterhin über
 * hasRole() aus dem AuthContext (admin/manager/user/readonly).
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { MODUL_REGISTRY } from '../lib/modulDefinitionen'

const ModuleContext = createContext({})
export const useModules = () => useContext(ModuleContext)

export function ModuleProvider({ children }) {
  // Global aktivierte optionale Module (Admin-Toggle)
  const [moduleState, setModuleState] = useState({})
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const sb = getSupabaseClient()
      const { data } = await sb.from('erp_module').select('modul_key,aktiv')
      const state = {}
      ;(data || []).forEach(m => { state[m.modul_key] = m.aktiv })
      setModuleState(state)
    } catch (e) {
      console.warn('ModuleContext:', e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  /**
   * Ist ein Modul verfügbar?
   * Kernmodule: immer ja.
   * Optionale Module: nur wenn ein Admin sie aktiviert hat.
   * (Noch nie umgeschaltete optionale Module gelten als inaktiv,
   * damit z.B. eQMS/Personal/DATEV nicht ungefragt auftauchen.)
   */
  const isActive = (key) => {
    const modul = MODUL_REGISTRY.find(m => m.key === key)
    if (!modul) return false
    if (modul.kern) return true
    return moduleState[key] === true
  }

  const isGlobalActive = (key) => moduleState[key] ?? false

  /**
   * Optionales Modul an/ausschalten (nur Admin — Rollen-Check erfolgt
   * durch den Aufrufer via hasRole('admin') vor dem Aufruf).
   */
  const toggleModule = async (key, aktiv, hasRoleFn) => {
    if (hasRoleFn && !hasRoleFn('admin')) {
      return { ok:false, error:'Nur Admins können Module aktivieren/deaktivieren.' }
    }
    const modul = MODUL_REGISTRY.find(m => m.key === key)
    if (modul?.kern) {
      return { ok:false, error:'Kernmodule können nicht deaktiviert werden.' }
    }
    const sb = getSupabaseClient()
    const { error } = await sb.from('erp_module').upsert({
      modul_key: key,
      bezeichnung: modul?.label || key,
      aktiv,
    }, { onConflict: 'modul_key' })
    if (error) {
      console.error('toggleModule Fehler:', error.message)
      return { ok:false, error: error.message }
    }
    setModuleState(prev => ({ ...prev, [key]: aktiv }))
    return { ok: true }
  }

  const activeModules = MODUL_REGISTRY
    .filter(m => isActive(m.key))
    .map(m => m.key)

  return (
    <ModuleContext.Provider value={{
      isActive, isGlobalActive, toggleModule,
      module: moduleState, activeModules, loading,
    }}>
      {children}
    </ModuleContext.Provider>
  )
}
