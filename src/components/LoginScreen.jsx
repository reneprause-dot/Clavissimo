/**
 * Clavissimo – LoginScreen
 */
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import BUILD_INFO from '../lib/buildInfo'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setFehler(null)
    setLoading(true)
    try {
      await signIn(email.trim(), passwort)
    } catch (e) {
      setFehler(e.message || 'Anmeldung fehlgeschlagen.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary,#F5F8F4)', fontFamily: "'IBM Plex Mono',monospace", padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: 380, background: 'var(--card-bg,#fff)',
        border: '1px solid var(--border,#DCE6DC)', borderRadius: 14, padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem' }}>🌿</div>
          <h1 style={{ margin: '0.4rem 0 0', fontSize: '1.1rem', color: 'var(--text-primary,#17241A)' }}>
            {BUILD_INFO.produkt}
          </h1>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted,#748575)' }}>
            Cannabis-Compliance. Einfach.
          </p>
        </div>

        {fehler && (
          <div style={{
            background: 'var(--danger,#B3261E)18', color: 'var(--danger,#B3261E)',
            borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.78rem', marginBottom: '1rem',
          }}>
            {fehler}
          </div>
        )}

        <label style={lbl}>E-Mail</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inp}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />

        <label style={lbl}>Passwort</label>
        <input value={passwort} onChange={e => setPasswort(e.target.value)} type="password" style={inp}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />

        <button onClick={handleLogin} disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Anmelden...' : 'Anmelden'}
        </button>
      </div>
    </div>
  )
}

const lbl = { display: 'block', color: 'var(--text-muted,#748575)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0.8rem 0 0.3rem' }
const inp = { width: '100%', boxSizing: 'border-box', background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.6rem 0.75rem', color: 'var(--text-primary,#17241A)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }
const btn = { width: '100%', marginTop: '1.25rem', background: 'var(--accent,#16A34A)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600 }
