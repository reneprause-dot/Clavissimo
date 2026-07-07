# Clavissimo

![Clavissimo](./app/public/clavissimo-banner.png)

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

## Deployment (GitHub Pages)

1. Im Repo unter **Settings → Pages** → "Build and deployment" → Source
   auf **GitHub Actions** stellen.
2. Unter **Settings → Secrets and variables → Actions** zwei Secrets anlegen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push auf `main` — der Workflow `.github/workflows/deploy.yml` baut
   `app/` und deployt automatisch nach `https://DEIN-USER.github.io/Clavissimo/`.
4. Der Proxy (`proxy/`) läuft weiterhin separat (z.B. Render.com) — GitHub
   Pages kann keine Node.js-Server hosten, nur statische Dateien.

`vite.config.js` hat `base: '/Clavissimo/'` fest eingetragen — falls das
Repo mal umbenannt wird, hier anpassen.

## Branding-Assets (app/public/)

Aus dem hochgeladenen Logo automatisch freigestellt (Schachbrett-
Transparenz-Marker entfernt) und in mehreren Varianten abgelegt:

| Datei | Verwendung |
|---|---|
| `clavis-logo.png` | Vollständiges Logo mit Schriftzug (transparent) |
| `clavis-icon.png` | Nur die Grafik ohne Schriftzug (transparent), z.B. Header |
| `icon-192.png` / `icon-512.png` | Quadratisch mit dunkelgrünem Hintergrund, für PWA-Manifest/App-Icon |
| `favicon.png` | Kleine quadratische Version für den Browser-Tab |
| `clavissimo-wallpaper.png` | Hintergrundbild für Login-/Setup-Screen |
| `clavissimo-banner.png` | Hero-/Social-Preview-Bild (README, og:image, Twitter Card) — hat einen fest eingebrannten Hintergrund, deshalb NICHT für UI-Icons verwendet |
