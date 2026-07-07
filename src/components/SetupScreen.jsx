/**
 * Clavissimo – SetupScreen
 * Wird angezeigt, wenn noch keine Supabase-Zugangsdaten hinterlegt sind
 * (weder über .env noch über localStorage). Einfache Ersteinrichtung,
 * kein Lizenzschlüssel, kein Mandanten-Wizard.
 */
import { useState } from 'react'
import { setSupabaseConfig } from '../lib/supabase'
import BUILD_INFO from '../lib/buildInfo'

export default function SetupScreen({ onFertig }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [fehler, setFehler] = useState(null)

  const handleSpeichern = () => {
    if (!url.trim() || !key.trim()) {
      setFehler('Bitte Supabase-URL und Anon-Key eintragen.')
      return
    }
    setSupabaseConfig(url.trim(), key.trim())
    onFertig?.()
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary,#F5F8F4)', fontFamily: "'IBM Plex Mono',monospace", padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'var(--card-bg,#fff)',
        border: '1px solid var(--border,#DCE6DC)', borderRadius: 14, padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem' }}>🌿</div>
          <h1 style={{ margin: '0.4rem 0 0', fontSize: '1.1rem', color: 'var(--text-primary,#17241A)' }}>
            {BUILD_INFO.produkt} einrichten
          </h1>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted,#748575)' }}>
            Supabase-Projekt verbinden
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

        <label style={lbl}>Supabase-URL</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" style={inp} />

        <label style={lbl}>Supabase Anon-Key</label>
        <input value={key} onChange={e => setKey(e.target.value)} placeholder="eyJhbGciOi..." style={inp} type="password" />

        <button onClick={handleSpeichern} style={btn}>Verbinden</button>

        <p style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-muted,#748575)', textAlign: 'center' }}>
          Diese Werte findest du in deinem Supabase-Projekt unter Project Settings → API.
        </p>
      </div>
    </div>
  )
}

const lbl = { display: 'block', color: 'var(--text-muted,#748575)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0.8rem 0 0.3rem' }
const inp = { width: '100%', boxSizing: 'border-box', background: 'var(--input-bg,#F5F8F4)', border: '1px solid var(--border,#DCE6DC)', borderRadius: 8, padding: '0.6rem 0.75rem', color: 'var(--text-primary,#17241A)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }
const btn = { width: '100%', marginTop: '1.25rem', background: 'var(--accent,#16A34A)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600 }
