/**
 * Clavissimo – Proxy-Server (Render.com)
 * Hält den Anthropic API-Key serverseitig, damit er nie im Frontend-
 * Bundle landet. Die App ruft diesen Proxy auf, der Proxy ruft
 * Anthropic auf und reicht die Antwort durch.
 *
 * Generisches Grundgerüst — falls dein ursprüngliches proxy.js aus
 * Clavis ERP zusätzliche Routen hat (z.B. für Lucem-OCR oder andere
 * Drittanbieter-APIs), diese hier ergänzen.
 */
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PORT = process.env.PORT || 3001

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT || 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER

const mailer = SMTP_HOST ? nodemailer.createTransport({
  host: SMTP_HOST, port: Number(SMTP_PORT), secure: Number(SMTP_PORT) === 465,
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
}) : null

// Admin-Client mit Service-Role-Key — bypasst RLS, deshalb NUR hier
// (serverseitig), NIEMALS im Frontend-Bundle verwenden.
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

app.get('/health', (req, res) => {
  res.json({ ok: true, produkt: 'Clavissimo-Proxy' })
})

/**
 * Prüft anhand des mitgeschickten Bearer-Tokens, ob der aufrufende
 * Nutzer in erp_users die Rolle 'admin' hat. Gibt die auth_id zurück
 * oder wirft, wenn nicht berechtigt/nicht eingeloggt.
 */
async function pruefeAdmin(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) throw new Error('Kein Token mitgeschickt.')
  if (!supabaseAdmin) throw new Error('Server ist nicht für Supabase-Admin-Zugriff konfiguriert.')

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user) throw new Error('Token ungültig oder abgelaufen.')

  const { data: erpUser, error: erpErr } = await supabaseAdmin
    .from('erp_users').select('role').eq('auth_id', userData.user.id).single()
  if (erpErr || erpUser?.role !== 'admin') throw new Error('Nur Admins dürfen Nutzer einladen.')

  return userData.user.id
}

/**
 * POST /api/invite-user
 * Body: { email, name, role }
 * Header: Authorization: Bearer <access_token des aufrufenden Admins>
 */
app.post('/api/invite-user', async (req, res) => {
  try {
    await pruefeAdmin(req)
  } catch (e) {
    return res.status(403).json({ ok: false, error: e.message })
  }

  const { email, name, role } = req.body || {}
  if (!email || !['admin', 'manager', 'user', 'readonly'].includes(role)) {
    return res.status(400).json({ ok: false, error: 'E-Mail und gültige Rolle erforderlich.' })
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    if (error) return res.status(500).json({ ok: false, error: error.message })

    const { error: insertErr } = await supabaseAdmin.from('erp_users').insert({
      auth_id: data.user.id, name: name || email, email, role,
    })
    if (insertErr) return res.status(500).json({ ok: false, error: insertErr.message })

    res.json({ ok: true, id: data.user.id })
  } catch (e) {
    console.error('invite-user Fehler:', e.message)
    res.status(500).json({ ok: false, error: 'Einladung fehlgeschlagen.' })
  }
})

/**
 * Prüft nur, ob der Token zu einem gültigen, eingeloggten Supabase-Nutzer
 * gehört (keine Rollenprüfung) — für Aktionen, die jeder erp_user darf.
 */
async function pruefeEingeloggt(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) throw new Error('Kein Token mitgeschickt.')
  if (!supabaseAdmin) throw new Error('Server ist nicht für Supabase-Admin-Zugriff konfiguriert.')
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) throw new Error('Token ungültig oder abgelaufen.')
  return data.user.id
}

/**
 * POST /api/send-email
 * Body: { to, subject, html, replyTo? }
 * Header: Authorization: Bearer <access_token>
 */
app.post('/api/send-email', async (req, res) => {
  try {
    await pruefeEingeloggt(req)
  } catch (e) {
    return res.status(403).json({ ok: false, error: e.message })
  }
  if (!mailer) {
    return res.status(500).json({ ok: false, error: 'SMTP ist auf dem Server nicht konfiguriert (SMTP_HOST fehlt).' })
  }
  const { to, subject, html, replyTo } = req.body || {}
  if (!to || !subject || !html) {
    return res.status(400).json({ ok: false, error: 'to, subject und html sind erforderlich.' })
  }
  try {
    await mailer.sendMail({ from: SMTP_FROM, to, subject, html, replyTo })
    res.json({ ok: true })
  } catch (e) {
    console.error('send-email Fehler:', e.message)
    res.status(500).json({ ok: false, error: 'E-Mail-Versand fehlgeschlagen.' })
  }
})

app.post('/api/claude', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY ist auf dem Server nicht gesetzt.' })
  }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (e) {
    console.error('Proxy-Fehler:', e.message)
    res.status(500).json({ error: 'Proxy-Anfrage fehlgeschlagen.' })
  }
})

app.listen(PORT, () => {
  console.log(`Clavissimo-Proxy läuft auf Port ${PORT}`)
})
