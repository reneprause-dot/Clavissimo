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

## MedCanG-Integration (neu)

Analog zu Clavis ERP ist MedCanG jetzt fest in Artikel-, Partner- und
Chargenverwaltung integriert (kein optionales Zusatzmodul):

- `sql/03_medcang_integration.sql` — Felder direkt aus dem echten
  Clavis-Code extrahiert (MedCanG.jsx/MedCanGPharma.jsx), inkl. neuer
  `chargen`-Tabelle
- `app/src/lib/medcangCompliance.js` — Erlaubnisprüfung (`pruefeErlaubnis`)
- `app/src/lib/btmBuch.js` — automatische BtM-Buch-Einträge bei
  Lieferschein (Verkauf) und Wareneingang (Einkauf)
- `app/src/lib/modulIntegration.js` — echte Umsetzung statt Stub;
  `Verkauf.jsx` blockiert jetzt Belege bei fehlender/abgelaufener
  Erlaubnis und zeigt den Grund an
- `Dashboard.jsx` zeigt ablaufende Erlaubnisse live an

**Bekannte Lücke**: BtM-Buch-Einträge sind aktuell artikel-, nicht
chargengenau (`charge_id` bleibt `NULL`), da Verkauf/Einkauf keine
Chargen-Auswahl pro Position haben — das ist eine UI-Erweiterung,
kein Schema-Thema.

## Theme-Fix

Der Standard-Fallback in `themes.js` zeigte auf `clavis_dark` statt
`clavissimo_green` — dadurch wirkte die App bei jedem Erstbesuch dunkel,
obwohl alle Komponenten bereits auf CSS-Variablen umgestellt waren.
Jetzt ist `clavissimo_green` (hell, Grün/Weiß) der Standard.

## Produktivstart-Paket (alle 8 Punkte umgesetzt)

| # | Thema | Umgesetzt als |
|---|---|---|
| 🔴 1 | RLS mit echter Rollenprüfung | `sql/07_rls_rollen.sql` — readonly/user/manager/admin, real gegen Postgres getestet |
| 🔴 2 | BtM-Buch unveränderlich | Teil von `07_rls_rollen.sql` — keine UPDATE/DELETE-Policy = für niemanden änderbar, inkl. Admin. Getestet. |
| 🔴 3 | Test-/Beispieldaten trennen | `sql/99_beispieldaten_entfernen.sql` — sicheres Cleanup-Skript mit Verwendungsprüfung |
| 🟡 4 | Chargen-Auswahl Verkauf | Neue Charge anlegen in `MedCanGPharma.jsx`, Auswahl (FEFO-sortiert) in `Verkauf.jsx`, Chargen-Bestand wird mitgeführt |
| 🟡 5 | Nutzerverwaltung ohne SQL | `Nutzerverwaltung.jsx` + `proxy/proxy.js` Endpoint `/api/invite-user` (Service-Role-Key bleibt serverseitig, echte Admin-Prüfung) |
| 🟡 6 | PDF-Export | `pdfExport.js` — Druckansicht (Browser "Als PDF speichern"), an Verkauf.jsx angebunden |
| 🟡 7 | GoBD-Festschreibung | `gobdFestschreibung.js` + UI in Einstellungen — SHA-256-Hash pro Periode, danach unveränderlich (real getestet) |
| 🟢 8 | Dashboard-KPIs | BtM-Bestand, Meldepflicht-Status, ablaufende Erlaubnisse als Kacheln |

### Nicht umgesetzt (bewusst, siehe Chat-Begründung)
- E-Mail-Benachrichtigungen bei Ablauf — Dashboard zeigt es beim Login, reicht für den Start
- Automatisierte Tests / Staging-Umgebung — organisatorisches Thema, kein Code-Artefakt
- PDF-Export für Einkauf.jsx — Funktion ist wiederverwendbar (`druckBeleg`), aber noch kein Button dort gesetzt
- WMS, Mahnwesen, DATEV-Export, eQMS, Personal — weiterhin Platzhalter, wie zu Beginn vereinbart

### Neue Umgebungsvariablen
- **App** (`app/.env`): `VITE_PROXY_URL` — Basis-URL des Render-Proxys, für Nutzerverwaltung
- **Proxy** (`proxy/.env`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — für `/api/invite-user`. Service-Role-Key **niemals** im Frontend verwenden.

### Neue SQL-Reihenfolge
`01 → 02 → 03 → 04 → 06 → 07` (05 = optionale Testdaten, 99 = deren Entfernung vor Go-Live)

## Runde 2: Storno, CoA, Buchhaltung, Nutzerstatus, E-Mail, Audit-Trail

| # | Thema | Umgesetzt als |
|---|---|---|
| 🔴 1 | Storno fertigstellen | `stornoLogik.js` — echte Gegenbuchung (Gutschrift), Original bleibt erhalten, OP wird ausgeglichen |
| 🔴 2 | CoA-Upload | Storage-Bucket `coa-dokumente` (privat) + Upload/Ansehen direkt in `MedCanGPharma.jsx` |
| 🔴 3 | AVV/DSGVO | **Nicht umsetzbar als Code** — organisatorisches Thema, siehe Chat |
| 🟡 4 | Buchungsjournal | Neues Modul `Buchhaltung.jsx`, ersetzt Platzhalter |
| 🟡 5 | Wareneingang → Charge-Erinnerung | Hinweisbanner in `Einkauf.jsx` mit Direktlink zur Chargen-Anlage (`onNavigate`-Prop jetzt an alle Module durchgereicht) |
| 🟡 6 | Nutzer-Deaktivierung | `erp_users.aktiv`, echte Durchsetzung in `AuthContext.jsx`/`App.jsx` (nicht nur UI-Anzeige) |
| 🟡 7 | E-Mail-Versand | `proxy.js` `/api/send-email` (SMTP-generisch) + `emailService.js` + `EmailPanel.jsx` |
| 🟡 8 | Audit-Trail | `logAudit()` jetzt auch bei Artikel-, Partner-, Nutzerrollen-/Statusänderungen |

### Neue Env-Variable (Proxy)
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — ohne sie bleibt E-Mail-Versand deaktiviert, alles andere funktioniert weiter.

### Neue SQL-Datei
`sql/08_storno_coa_nutzerstatus.sql` — nach 07 ausführen.

### Weiterhin bewusst offen
- PDF-Button in `Einkauf.jsx` (Funktion vorhanden, nicht verdrahtet)
- Automatisierte Tests, Staging
- Mahnwesen, DATEV, WMS, eQMS, Personal — Platzhalter

## Runde 3: Lagerverwaltung (WMS)

Bisher Platzhalter, jetzt echtes Modul:
- `sql/09_lagerorte.sql` — echte Lagerorte-Tabelle (Code, Bezeichnung, Typ: Standard/Kühlraum/Tresor/Quarantäne), 9 Startwerte
- `WMS.jsx` — zwei Tabs: Lagerorte verwalten (CRUD), Bestand je Lagerort (Artikel + Chargen gruppiert, inkl. "ohne Lagerort"-Warnbereich)
- `Lager.jsx` — Lagerort-Feld in der Artikelkarte ist jetzt Dropdown statt Freitext
- `MedCanGPharma.jsx` — Chargen-Neuanlage hat jetzt Lagerort-Auswahl, Chargenkarte zeigt Lagerort an (echte `lagerort_id`-Referenz auf `chargen`, für Rückverfolgung)

Hinweis: Artikel-Lagerort bleibt technisch ein Freitext-Feld (Abgleich per
Bezeichnung mit `lagerorte`), Chargen haben eine echte Fremdschlüssel-
Referenz. Für vollständige Konsistenz könnte man `artikel.lagerort`
später auf eine echte `lagerort_id`-Spalte umstellen — aktuell bewusst
nicht gemacht, um Altdaten nicht zu brechen.
