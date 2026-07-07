# Clavissimo

Schlankes ERP für Cannabis-Unternehmen (MedCanG). Details siehe [`CLAVISSIMO_SPEC.md`](./CLAVISSIMO_SPEC.md).

## Struktur

```
app/      → Frontend (React + Vite), wird auf Cloudflare Pages deployt
proxy/    → Node.js-Proxy (API-Keys serverseitig), wird auf Render.com deployt
sql/      → Supabase-Schema (im SQL-Editor ausführen)
```

## Lokal starten

```bash
# Frontend
cd app
cp .env.example .env    # Werte eintragen
npm install
npm run dev

# Proxy (separates Terminal)
cd proxy
cp .env.example .env    # ANTHROPIC_API_KEY eintragen
npm install
npm start
```

## ⚠️ Noch zu erledigen, bevor die App vollständig läuft

Diese Dateien sind als funktionsfähige Platzhalter angelegt, weil die
Original-Implementierungen bisher nicht Teil des Uploads waren. Die App
**baut und startet** damit, aber folgende Funktionen tun noch nichts
Echtes:

| Datei | Aktuell | Ersetzen durch |
|---|---|---|
| `app/src/lib/emailService.js` | E-Mail-Versand deaktiviert | echte Implementierung aus Clavis ERP |
| `app/src/lib/stornoLogik.js` | wirft Fehler bei Aufruf | echte Storno-Logik aus Clavis ERP |
| `app/src/lib/pdfExport.js` | zeigt nur einen Alert | echter PDF-Export aus Clavis ERP |
| `app/src/lib/auditTrail.js` | minimal (nur Insert in gobd_protokoll) | ggf. umfangreichere Version aus Clavis ERP |
| `app/src/lib/modulIntegration.js` | No-Op-Stub | nur nötig falls modulübergreifende Automatisierung gewünscht ist |
| `app/src/components/BelegVorschau.jsx` | zeigt nur Hinweistext | echte Komponente aus Clavis ERP |
| `app/src/components/EmailPanel.jsx` | zeigt nur Hinweistext | echte Komponente aus Clavis ERP |

Außerdem laut `App.jsx` noch ohne eigene Oberfläche (zeigen aktuell
`Platzhalter.jsx`): WMS, Buchungsjournal, Mahnwesen, DATEV, GoBD,
Partnerstamm, BtM-Buch, Erlaubnis-Monitor, eQMS, Personal.

`Dashboard.jsx` ist ebenfalls nur eine Basisversion — die KPI-Kacheln
aus der Spec (BtM-Bestand, ablaufende Erlaubnisse, Meldepflichten)
fehlen noch.

## Deployment

Siehe Chat-Verlauf für die ausführliche Schritt-für-Schritt-Anleitung
(GitHub → Supabase → Render.com → Cloudflare Pages).
