import { createContext, useContext, useEffect, useState } from 'react'
import { getSupabaseClient, isConfigured } from '../lib/supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null)
  const [erpUser,      setErpUser]      = useState(null)
  const [erpUserFehlt, setErpUserFehlt] = useState(false)
  const [configured,   setConfigured]   = useState(isConfigured())

  // EINZIGE ÄNDERUNG vs Original:
  // loading=false wenn nicht konfiguriert, loading=true wenn konfiguriert
  // Das verhindert die Dauerschleife beim Setup-Screen
  const [loading, setLoading] = useState(isConfigured())

  const loadErpUser = async (accessToken, authUserId) => {
    try {
      const url = localStorage.getItem('erp_supabase_url')
      const key = localStorage.getItem('erp_supabase_key')
      const res = await fetch(
        `${url}/rest/v1/erp_users?auth_id=eq.${authUserId}&select=*&limit=1`,
        { headers: { 'apikey': key, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      )
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data[0]
      return null
    } catch(e) {
      console.error('loadErpUser Fehler:', e)
      return null
    }
  }

  useEffect(() => {
    if (!configured) { setLoading(false); return }
    const sb = getSupabaseClient()
    if (!sb) { setLoading(false); return }

    let mounted = true

    const { data: listener } = sb.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null); setErpUser(null); setErpUserFehlt(false); setLoading(false)
        return
      }
      if (session?.user) {
        setUser(session.user)
        const eu = await loadErpUser(session.access_token, session.user.id)
        if (!mounted) return
        if (eu) { setErpUser(eu); setErpUserFehlt(false) }
        else     { setErpUserFehlt(true) }
        setLoading(false)
      }
    })

    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return
      // Session nicht vorhanden -> sofort loading beenden
      // Session vorhanden -> onAuthStateChange regelt den Rest
      if (!data?.session) {
        setLoading(false)
      }
    }).catch(() => {
      // Verbindungsfehler -> sofort loading beenden -> LoginScreen
      if (mounted) setLoading(false)
    })

    const timeout = setTimeout(() => { if (mounted) setLoading(false) }, 3000)

    return () => {
      mounted = false
      clearTimeout(timeout)
      listener?.subscription?.unsubscribe()
    }
  }, [configured])

  const signIn = async (email, password) => {
    const sb = getSupabaseClient()
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    try { const sb = getSupabaseClient(); if (sb) await sb.auth.signOut() }
    catch(e) { console.warn('signOut:', e) }
    setUser(null); setErpUser(null); setErpUserFehlt(false)
  }

  const hasRole = (requiredRole) => {
    const roles = { readonly:0, user:1, manager:2, admin:3 }
    return (roles[erpUser?.role||'readonly']??0) >= (roles[requiredRole]??0)
  }

  const reconfigure = () => {
    setConfigured(isConfigured())
    setLoading(isConfigured())
  }

  return (
    <AuthContext.Provider value={{
      user, erpUser, loading, configured, erpUserFehlt,
      signIn, signOut, hasRole, reconfigure
    }}>
      {children}
    </AuthContext.Provider>
  )
}
