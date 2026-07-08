/**
 * Clavissimo – Nutzerverwaltung
 * Neue Nutzer einladen läuft über den Proxy (Service-Role-Key bleibt
 * serverseitig, siehe proxy/proxy.js /api/invite-user). Rollen ändern
 * läuft direkt über die App (erp_users-RLS erlaubt das Admins).
 *
 * Braucht VITE_PROXY_URL in der .env (Basis-URL deines Render.com-Proxys).
 */
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { logAudit } from '../lib/auditTrail'

const ROLLEN = ['readonly', 'user', 'manager', 'admin']
const PROXY_URL = import.meta.env.VITE_PROXY_URL || ''

export default function Nutzerverwaltung() {
  const { hasRole, erpUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [neu, setNeu] = useState({ email: '', name: '', role: 'user' })
  const [einladen, setEinladen] = useState(false)
  const [msg, setMsg] = useState(null)
  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000) }

  const load = async () => {
    setLoading(true)
    const sb = getSupabaseClient()
    const { data } = await sb.from('erp_users').select('*').order('name')
    setUsers(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleEinladen = async () => {
    if (!neu.email.trim()) { showMsg(false, 'E-Mail ist Pflichtfeld.'); return }
    if (!PROXY_URL) { showMsg(false, 'VITE_PROXY_URL ist nicht konfiguriert.'); return }
    setEinladen(true)
    try {
      const sb = getSupabaseClient()
      const { data: sessionData } = await sb.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch(`${PROXY_URL}/api/invite-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(neu),
      })
      const result = await res.json()
      if (!result.ok) { showMsg(false, result.error || 'Einladung fehlgeschlagen.'); setEinladen(false); return }
      showMsg(true, `Einladung an ${neu.email} verschickt.`)
      setNeu({ email: '', name: '', role: 'user' })
      load()
    } catch (e) {
      showMsg(false, `Fehler: ${e.message}`)
    }
    setEinladen(false)
  }

  const handleRolleAendern = async (user, rolle) => {
    const sb = getSupabaseClient()
    const { error } = await sb.from('erp_users').update({ role: rolle }).eq('id', user.id)
    if (error) { showMsg(false, error.message); return }
    await logAudit('nutzer_rolle_geaendert', { nutzerId: user.id, email: user.email, vonRolle: user.role, zuRolle: rolle, geaendertVon: erpUser?.id })
    load()
  }

  const handleAktivToggle = async (user) => {
    const sb = getSupabaseClient()
    const { error } = await sb.from('erp_users').update({ aktiv: !user.aktiv }).eq('id', user.id)
    if (error) { showMsg(false, error.message); return }
    await logAudit(user.aktiv ? 'nutzer_deaktiviert' : 'nutzer_aktiviert', { nutzerId: user.id, email: user.email, geaendertVon: erpUser?.id })
    load()
  }

  if (!hasRole('admin')) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted,#748575)' }}>Nur für Admins sichtbar.</div>
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.3rem', color: 'var(--text-primary,#17241A)' }}>👤 Nutzerverwaltung</h1>

      {msg && (
        <div style={{
          padding: '0.6rem 0.9rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1rem',
          background: msg.ok ? 'var(--success,#16A34A)18' : 'var(--danger,#B3261E)18',
          color: msg.ok ? 'var(--success,#16A34A)' : 'var(--danger,#B3261E)',
        }}>
          {msg.text}
        </div>
      )}

      {!PROXY_URL && (
        <div style={{ padding: '0.6rem 0.9rem', borderRadius: 8, fontSize: '0.78rem', marginBottom: '1rem', background: 'var(--warning,#B4650F)18', color: 'var(--warning,#B4650F)' }}>
          ⚠️ <code>VITE_PROXY_URL</code> ist nicht gesetzt — "Einladen" funktioniert erst, wenn die Proxy-URL in den Umgebungsvariablen hinterlegt ist.
        </div>
      )}

      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', maxWidth: 560 }}>
        <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.9rem', color: 'var(--text-primary,#17241A)' }}>Neuen Nutzer einladen</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
          <div>
            <label style={lbl}>E-Mail *</label>
            <input value={neu.email} onChange={e => setNeu({ ...neu, email: e.target.value })} style={inp} type="email" />
          </div>
          <div>
            <label style={lbl}>Name</label>
            <input value={neu.name} onChange={e => setNeu({ ...neu, name: e.target.value })} style={inp} />
          </div>
          <div>
            <label style={lbl}>Rolle</label>
            <select value={neu.role} onChange={e => setNeu({ ...neu, role: e.target.value })} style={inp}>
              {ROLLEN.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleEinladen} disabled={einladen} style={{ ...btnPrimary, opacity: einladen ? 0.6 : 1 }}>
          {einladen ? 'Sende Einladung...' : '✉️ Einladen'}
        </button>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted,#748575)' }}>
          Der Nutzer bekommt eine Einladungs-E-Mail von Supabase und setzt sich dort selbst ein Passwort.
        </p>
      </div>

      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead><tr style={{ background: 'var(--bg-primary,#F5F8F4)' }}>
            {['Name', 'E-Mail', 'Rolle', 'Status', 'Angelegt'].map(h => (
              <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', color: 'var(--text-muted,#748575)', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted,#748575)' }}>Lade…</td></tr>
            : users.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--border,#DCE6DC)', opacity: u.aktiv === false ? 0.5 : 1 }}>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-primary,#17241A)', fontWeight: 500 }}>{u.name || '–'}</td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary,#3E4E40)' }}>{u.email}</td>
                <td style={{ padding: '0.65rem 1rem' }}>
                  <select value={u.role} onChange={e => handleRolleAendern(u, e.target.value)} style={{ ...inp, padding: '0.3rem 0.5rem', fontSize: '0.76rem', width: 'auto' }}>
                    {ROLLEN.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '0.65rem 1rem' }}>
                  <button onClick={() => handleAktivToggle(u)} style={{
                    background: u.aktiv === false ? 'var(--text-muted,#748575)18' : 'var(--success,#16A34A)18',
                    color: u.aktiv === false ? 'var(--text-muted,#748575)' : 'var(--success,#16A34A)',
                    border: 'none', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600,
                  }}>
                    {u.aktiv === false ? '⊘ Deaktiviert' : '✓ Aktiv'}
                  </button>
                </td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted,#748575)', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('de-DE') : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const lbl = { display: 'block', color: 'var(--text-muted,#748575)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }
const inp = { width: '100%', boxSizing: 'border-box', background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.55rem 0.7rem', color: 'var(--text-primary,#17241A)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }
const btnPrimary = { background: 'var(--accent,#16A34A)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.25rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600 }
