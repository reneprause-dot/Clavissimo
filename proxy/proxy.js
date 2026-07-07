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

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const PORT = process.env.PORT || 3001

app.get('/health', (req, res) => {
  res.json({ ok: true, produkt: 'Clavissimo-Proxy' })
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
