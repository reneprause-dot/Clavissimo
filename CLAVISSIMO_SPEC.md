# Clavissimo – Produkt-Spezifikation
## Standalone ERP für Cannabis-Unternehmen (MedCanG)
### Neue Session / Neues Projekt

---

## Vision

**Clavissimo** ist ein schlankes, spezialisiertes ERP-System für Unternehmen im Bereich medizinisches Cannabis (MedCanG). Es kombiniert die relevanten Standard-ERP-Module aus Clavis ERP mit dem MedCanG-Branchenmodul zu einer eigenständigen, sofort einsatzbereiten Lösung — ohne den Overhead eines vollständigen ERP.

Clavissimo versteht sich als **in sich vollständige, eigenständige Lösung**: kein Modul-Lizenzsystem, keine gestaffelten Freischaltungen. Wer Clavissimo erwirbt, erhält alle Kern- und Compliance-Module uneingeschränkt.

**Zielgruppe:**
- Cannabis-Großhändler (§52a AMG + BtM-Erlaubnis)
- Hersteller medizinischer Cannabisprodukte (§13 AMG)
- Distributoren mit GDP-Zertifikat

---

## Technischer Stack (identisch zu Clavis ERP)

```
Frontend:  React 18 + Vite + Tailwind (oder inline styles wie Clavis)
Backend:   Supabase (PostgreSQL + Auth + Storage + Edge Functions)
Hosting:   Cloudflare Pages (Frontend)
Proxy:     Render.com (Node.js — API Keys server-seitig)
Repo:      GitHub (neues separates Repo)
PWA:       Vite PWA Plugin
```

**Supabase Projekt:** Neues Projekt (getrennt von Clavis ERP)
**GitHub Repo:** `reneprause-dot/Clavissimo` (oder eigene Org)

---

## Enthaltene Module

### Kernmodule (immer aktiv)

| Modul | Funktion | Clavis-Basis |
|---|---|---|
| **Artikel-Stamm** | Artikel mit MedCanG-Feldern (PZN, THC/CBD, Sorte, BtM-pflichtig, AMG-Kategorie) | `ArtikelStamm.jsx` angepasst |
| **Partner-Stamm** | Lieferanten/Kunden mit Erlaubnis-Tracking (§52a AMG, BtM, GDP-Zertifikat, IK-Nummer) | `PartnerStamm.jsx` angepasst |
| **Lager** | Bestandsführung mit Chargenpflicht, BtM-Kennzeichen, Quarantäne | `Lager.jsx` |
| **WMS** | Lagerverwaltung mit Chargenrückverfolgung | `WMS.jsx` |
| **Einkauf** | Lieferantenrechnungen, Wareneingang mit CoA-Pflicht | `Einkauf.jsx` |
| **Verkauf** | Aufträge/Rechnungen mit Erlaubnisprüfung vor Auftrag | `Verkauf.jsx` |
| **Buchhaltung** | Buchungsjournal, SKR04, GoBD-konform | `Buchungsjournal.jsx` |
| **Mahnwesen** | Offene Posten, Mahnläufe | `Mahnwesen.jsx` |
| **Dashboard** | KPIs, Ablauf-Warnungen (Erlaubnisse!), BtM-Bestand | `Dashboard.jsx` angepasst |

### MedCanG-Modul (Kern von Clavissimo)

| Funktion | Detail |
|---|---|
| **Cannabis-Artikel** | PZN, THC/CBD-Gehalt, Sorte, BtM-pflichtig Flag, AMG-Kategorie, GMP-Klasse |
| **Chargen & CoA** | Certificate of Analysis je Charge, Freigabe-Workflow, Rückverfolgung |
| **Erlaubnismanagement** | §52a AMG, BtM-Erlaubnis, GDP-Zertifikat je Partner mit Ablaufdatum + Warnfrist |
| **BtM-Buchführung** | Zugangs-/Abgangsbuch nach §13 BtMVV, Monatliche Bestandsabgleiche |
| **Meldepflichten** | Jahresabschluss-Export für BfArM, Bestandsmeldungen |
| **Vorschriften-Wiki** | MedCanG-Überblick, Erlaubnisse, Chargendoku, BtM-Vorschriften, Lagervorschriften |
| **GDP-Compliance** | Temperaturmonitoring, Lieferantenqualifizierung, Schulungsmanagement |

### Optional aktivierbar (technisch, nicht lizenzgebunden)

Diese Module sind Teil der einen Clavissimo-Lösung und können vom Admin jederzeit selbst ein-/ausgeschaltet werden — es gibt keine separate Freischaltung oder Lizenzprüfung dafür.

| Modul | Wann relevant |
|---|---|
| **eQMS** | Bei GMP/GDP-Zertifizierungsanforderungen (CAPA, Audits, Dokumente) |
| **Personal** | Bei eigenem Personal / Schulungsnachweise für GDP |
| **DATEV Export** | Bei Steuerberater-Anbindung |
| **GoBD** | Festschreibung / Hash-Prüfung für Buchungen |

---

## Abgrenzung zu Clavis ERP

| Aspekt | Clavis ERP | Clavissimo |
|---|---|---|
| Zielgruppe | Allgemein (alle Branchen) | Spezifisch Cannabis/MedCanG |
| Modulanzahl | 54 Module | ~16 fokussierte Module |
| Setup-Aufwand | Hoch (Branchenauswahl, Konfiguration) | Minimal (sofort einsatzbereit) |
| Lizenzmodell | Per Modul | Pay-once + Wartungsvertrag |
| Branding | Clavis ERP | Clavissimo |

---

## Datenbankschema (aus Clavis ERP zu übernehmen)

### Tabellen direkt übernehmen:

```sql
-- Stammdaten
artikel                  -- + MedCanG-Felder (pzn, btm_pflichtig, thc_gehalt, cbd_gehalt, sorte, medcang_kategorie, amg_zulassungsnummer, amg_kategorie, gmp_klasse)
geschaeftspartner        -- + Erlaubnis-Felder (medcang_erlaubnis, medcang_erlaubnis_gueltig, medcang_behoerde, btm_erlaubnis, btm_erlaubnis_gueltig, apotheken_ik, grosshandels_erlaubnis, gdp_zertifikat, gdp_zertifikat_gueltig)
konten                   -- SKR04

-- Lager
chargen                  -- Chargenverwaltung mit CoA-Link
artikelbewegungen        -- Mit BtM-Kennzeichen
lagerorte

-- Finanzen
buchungen                -- GoBD-konform mit Festschreibung
verkaufsbelege           -- Verkaufsbelege + Aufträge
einkaufsbelege           -- Eingangsrechnungen + Wareneingang
offene_posten            -- Mahnwesen
gobd_perioden
gobd_protokoll

-- Compliance
qm_dokumente             -- GDP-Dokumente
qm_schulungen            -- GDP-Schulungsnachweis
qm_schulungsnachweise
temperatur_protokoll     -- GDP-Temperaturmonitoring
temperatur_zonen

-- System
erp_users
mandanten                -- Vereinfacht: nur ein Mandant
nummernserien
einstellungen
erp_module               -- Ein-/Ausschalten der optionalen Module (kein Lizenzbezug)
```

### Neue Tabellen spezifisch für Clavissimo:

```sql
-- BtM-Buchführungspflicht (§13 BtMVV)
CREATE TABLE btm_buch (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ             TEXT NOT NULL,   -- 'zugang' | 'abgang'
  datum           DATE NOT NULL,
  charge_id       UUID REFERENCES chargen(id),
  artikel_id      UUID REFERENCES artikel(id),
  menge           NUMERIC(15,4) NOT NULL,
  einheit         TEXT,
  partner_id      UUID REFERENCES geschaeftspartner(id),  -- Lieferant / Empfänger
  belegnr         TEXT,
  empfaenger_erlaubnis TEXT,       -- §-Angabe der Erlaubnis
  bestand_nach    NUMERIC(15,4),   -- Fortlaufender Bestand
  gebucht_von     UUID REFERENCES erp_users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Monatliche BtM-Bestandsmeldung
CREATE TABLE btm_meldungen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monat           TEXT NOT NULL,   -- JJJJ-MM
  status          TEXT DEFAULT 'entwurf',
  bestand_anfang  JSONB,           -- { artikel_id: menge }
  zugaenge        NUMERIC(15,4),
  abgaenge        NUMERIC(15,4),
  bestand_ende    JSONB,
  differenz       NUMERIC(15,4),
  gemeldet_am     DATE,
  gemeldet_an     TEXT,            -- Behörde
  erstellt_von    UUID REFERENCES erp_users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Erlaubnis-Überwachung (automatische Warnungen)
CREATE TABLE erlaubnis_warnungen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID REFERENCES geschaeftspartner(id),
  erlaubnis_typ   TEXT NOT NULL,   -- 'medcang' | 'btm' | 'gdp' | 'grosshandel'
  gueltig_bis     DATE NOT NULL,
  warnung_tage    INTEGER DEFAULT 90,
  status          TEXT DEFAULT 'aktiv',   -- aktiv | behoben | ignoriert
  erstellt_at     TIMESTAMPTZ DEFAULT now()
);
```

---

## Kritische Business-Logik

### Erlaubnisprüfung vor Auftragsanlage

```js
// Vor jedem Verkaufsauftrag:
async function pruefeErlaubnis(partnerId) {
  const partner = await sb.from('geschaeftspartner')
    .select('medcang_erlaubnis_gueltig, btm_erlaubnis_gueltig, gdp_zertifikat_gueltig')
    .eq('id', partnerId).single()

  const heute = new Date().toISOString().slice(0,10)
  const warnungen = []

  if (!partner.medcang_erlaubnis_gueltig || partner.medcang_erlaubnis_gueltig < heute)
    warnungen.push('MedCanG-Erlaubnis fehlt oder abgelaufen!')
  if (!partner.btm_erlaubnis_gueltig || partner.btm_erlaubnis_gueltig < heute)
    warnungen.push('BtM-Erlaubnis fehlt oder abgelaufen!')

  return { erlaubt: warnungen.length === 0, warnungen }
}
```

### BtM-Buch automatisch führen

```js
// Bei jedem Lagerabgang von BtM-Artikeln:
async function bucheBtMAusgang(chargeId, menge, partnerId, belegnr) {
  const charge = await getCharge(chargeId)
  if (!charge.artikel.btm_pflichtig) return

  await sb.from('btm_buch').insert({
    typ: 'abgang',
    datum: heute(),
    charge_id: chargeId,
    artikel_id: charge.artikel_id,
    menge,
    partner_id: partnerId,
    belegnr,
    bestand_nach: await berechneBestand(charge.artikel_id),
  })
}
```

### Ablauf-Warnungen (Dashboard)

```js
// Beim Dashboard-Load:
const ablaufendeErlaubnisse = await sb.from('geschaeftspartner')
  .select('name, medcang_erlaubnis_gueltig, btm_erlaubnis_gueltig, gdp_zertifikat_gueltig')
  .or(`medcang_erlaubnis_gueltig.lte.${in90Tagen},btm_erlaubnis_gueltig.lte.${in90Tagen}`)
  .eq('aktiv', true)
```

---

## Benutzerrollen

| Rolle | Rechte |
|---|---|
| `admin` | Alles inkl. Systemkonfiguration, Modul-Ein-/Ausschalten |
| `manager` | BtM-Freigaben, Perioden festschreiben |
| `user` | Erfassung, Buchung, Einsicht |
| `readonly` | Nur lesen (z.B. für Behörden-Audit) |

---

## Branding / UI

```
Produktname:   Clavissimo
Tagline:       "Cannabis-Compliance. Einfach."
Primärfarbe:   #16a34a (Cannabis-Grün) statt #0e7490 (Clavis-Blau)
Sekundärfarbe: #166534
Icon/Logo:     🌿 (oder eigenes SVG)
Font:          IBM Plex Mono (wie Clavis)
Theme:         Hell (Cannabis-Grün) + Dark-Variante wählbar
```

---

## Lizenz- und Vertragsmodell

**Kein Modul-Lizenzsystem.** Clavissimo ist technisch eine einzige, vollständige Lösung — es gibt keine Freischaltung einzelner Module nach Kundentyp oder Vertragsstufe. Jeder Kunde erhält denselben Funktionsumfang; optionale Module (eQMS, Personal, DATEV, GoBD) schaltet der jeweilige Admin selbst ein oder aus, ohne Rückfrage beim Hersteller.

**Kommerzielles Modell: Pay-once + Wartungsvertrag**

```
Einmalzahlung:     Einmaliger Kaufpreis für die Software (unbefristete Nutzung)
Wartungsvertrag:   3 Jahre, vertraglich gebunden
                   - Updates & Sicherheitspatches
                   - Support bei technischen Störungen
                   - Ggf. Anpassungen bei Gesetzesänderungen (MedCanG, BtMG, GDP)
Nach 3 Jahren:      Verlängerung optional (z.B. jährlich), Software bleibt
                    ohne Wartungsvertrag nutzbar, nur ohne Updates/Support
```

Hinweis: Die genaue Preisgestaltung (Kaufpreis, Wartungsgebühr p.a., Staffelung nach Nutzerzahl o.ä.) ist noch offen und unabhängig von der Softwarearchitektur — im Code gibt es dafür keine Beschränkung oder Prüfung, das ist rein vertraglich/kaufmännisch zu regeln.

---

## Was aus Clavis ERP direkt übernommen wird

Die folgenden Dateien können **fast unverändert** übernommen werden:

```
src/lib/
  supabase.js          → identisch
  dbHelper.js          → identisch
  zeitHelfer.js        → identisch (bei Clavissimo neu geschrieben, da im Original nicht vorhanden)
  buchungslogik.js      → identisch (SKR04)
  auditTrail.js        → identisch
  themes.js            → Cannabis-Grün-Theme ergänzt (clavissimo_green)

src/context/
  AuthContext.jsx      → identisch
  ModuleContext.jsx    → vereinfacht: kein Lizenzsystem, nur Kernmodul/Admin-Toggle

src/components/
  layout/AppLayout.jsx → Header-Navigation mit Dropdown-Kategorien statt Sidebar
  LoginScreen.jsx      → Branding anpassen
  SetupScreen.jsx      → identisch

src/modules/
  buchhaltung/         → identisch
  lager/               → identisch, retheme auf Clavissimo-Palette
  einkauf/             → identisch, retheme auf Clavissimo-Palette
  verkauf/             → identisch, retheme auf Clavissimo-Palette
  mahnwesen/           → identisch
  wms/                 → identisch
  gobd/                → identisch
  branche/MedCanGPharma.jsx → Kernmodul, retheme auf Clavissimo-Palette
```

---

## Was neu gebaut / angepasst wird

1. **Dashboard** — MedCanG-spezifische KPIs: BtM-Bestand, ablaufende Erlaubnisse, offene Meldepflichten
2. **Artikel-Stamm** — MedCanG-Felder als Pflichtfelder, kein Overhead für andere Branchen
3. **Partner-Stamm** — Erlaubnis-Tracking als zentrales Feature, nicht optional
4. **Navigation** — Header mit Dropdown-Kategorien statt Sidebar, mehr Platz für die Arbeitsfläche
5. **BtM-Buch** — neues Modul (oben spezifiziert)
6. **Erlaubnis-Monitor** — Dashboard-Widget + eigenständige Seite
7. **Onboarding** — vereinfachter Setup (kein mandanten-Wizard, kein Lizenzschlüssel)
8. **ModuleContext** — vereinfacht auf zwei Ebenen: Kernmodul (immer an) / optionales Modul (Admin-Toggle), kein Lizenzsystem

---

## Dateien zum Hochladen in neue Session

```bash
# Aus Clavis ERP hochladen:
cat ~/clavis-erp/erp-system/src/modules/branche/MedCanGPharma.jsx
cat ~/clavis-erp/erp-system/src/modules/branche/MedCanG.jsx
cat ~/clavis-erp/erp-system/src/lib/buchungslogik.js
cat ~/clavis-erp/erp-system/src/lib/dbHelper.js
cat ~/clavis-erp/erp-system/src/modules/lager/Lager.jsx
cat ~/clavis-erp/erp-system/src/modules/einkauf/Einkauf.jsx
cat ~/clavis-erp/erp-system/src/modules/verkauf/Verkauf.jsx
cat ~/clavis-erp/erp-system/proxy.js
```

---

## Rechtliches / Compliance-Hinweis

Clavissimo deckt die **softwareseitige** BtM-Buchführung ab.
Es ersetzt **keine** Rechtsberatung — Nutzer sind selbst für
die Einholung der erforderlichen Behördenerlaubnisse verantwortlich.

Relevante Gesetze:
- MedCanG (Medizinal-Cannabisgesetz), in Kraft seit 01.04.2024
- BtMG (Betäubungsmittelgesetz)
- BtMVV (Betäubungsmittel-Verschreibungsverordnung)
- AMG (Arzneimittelgesetz) §52a (Großhandelserlaubnis)
- EU-GDP-Leitlinien 2013/C 343/01

---

*Erstellt auf Basis von Clavis ERP v1.2.0 Session-Analyse*
*Aktualisiert: Juli 2026 — Lizenzmodell auf Pay-once + 3 Jahre Wartungsvertrag umgestellt*
