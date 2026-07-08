/**
 * Clavissimo – Supabase-Client
 * Generisches Setup: liest URL + Anon-Key aus Vite-Env-Variablen
 * (.env → VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY), mit Fallback auf
 * localStorage für den Fall, dass die App über einen Setup-Screen
 * konfiguriert wird statt über Build-Time-Env-Variablen.
 */
import { createClient } from '@supabase/supabase-js'

let client = null

function resolveConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('erp_supabase_url') || ''
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('erp_supabase_key') || ''
  return { url, key }
}

export function isConfigured() {
  const { url, key } = resolveConfig()
  return Boolean(url && key)
}

export function getSupabaseClient() {
  if (client) return client
  const { url, key } = resolveConfig()
  if (!url || !key) return null
  client = createClient(url, key)
  return client
}

/**
 * Für einen Setup-Screen: Zugangsdaten zur Laufzeit setzen
 * (z.B. wenn kein .env genutzt wird, sondern der Nutzer die Werte
 * beim Ersteinrichten selbst einträgt).
 */
export function setSupabaseConfig(url, key) {
  localStorage.setItem('erp_supabase_url', url)
  localStorage.setItem('erp_supabase_key', key)
  client = null // Client neu erstellen beim nächsten getSupabaseClient()
}
