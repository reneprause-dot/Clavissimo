-- ============================================================
-- Clavissimo – SQL Teil 2: MedCanG-Feldintegration in Standardtabellen
-- ============================================================
-- Diese Felder wurden NICHT geraten, sondern direkt aus den .select()/
-- .insert()/.update()-Aufrufen in MedCanG.jsx und MedCanGPharma.jsx
-- extrahiert (grep über die tatsächlichen Query-Strings). Nach
-- 01_schema_clavis_basis.sql ausführen, VOR 03_btm_und_erlaubnis.sql
-- (die dortige btm_buch-Tabelle referenziert die hier angelegte chargen-Tabelle).
--
-- Prinzip: MedCanG ist bei Clavissimo kein optionales Zusatzmodul,
-- sondern in artikel/geschaeftspartner/chargen fest verankert (siehe
-- CLAVISSIMO_SPEC.md — "kein Lizenzsystem", "in sich vollständige
-- Lösung"). Deshalb ALTER TABLE auf die Kern-Tabellen statt separater
-- medcang_*-Zusatztabellen mit 1:1-Beziehung.
-- ============================================================

-- ── ARTIKEL: MedCanG-Pflichtfelder ─────────────────────────────────────
-- Quelle: MedCanGPharma.jsx Zeile 48 (vollständigste Feldliste)
ALTER TABLE artikel
  ADD COLUMN IF NOT EXISTS pzn                      TEXT,
  ADD COLUMN IF NOT EXISTS btm_pflichtig             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medcang_kategorie         TEXT,
  ADD COLUMN IF NOT EXISTS thc_gehalt                NUMERIC(5,2),   -- deklarierter Wert am Artikel
  ADD COLUMN IF NOT EXISTS cbd_gehalt                NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS sorte                     TEXT,
  ADD COLUMN IF NOT EXISTS amg_zulassungsnummer      TEXT,
  ADD COLUMN IF NOT EXISTS amg_kategorie             TEXT,
  ADD COLUMN IF NOT EXISTS gmp_klasse                TEXT,
  ADD COLUMN IF NOT EXISTS serialisierungspflichtig  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS temperaturklasse           TEXT,
  ADD COLUMN IF NOT EXISTS haltbarkeit_tage           INTEGER;

CREATE INDEX IF NOT EXISTS idx_artikel_pzn ON artikel(pzn) WHERE pzn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artikel_btm_pflichtig ON artikel(btm_pflichtig) WHERE btm_pflichtig = true;

-- ── GESCHAEFTSPARTNER: Erlaubnis-Tracking ──────────────────────────────
-- Quelle: MedCanGPharma.jsx Zeile 50 (vollständigste Feldliste)
ALTER TABLE geschaeftspartner
  ADD COLUMN IF NOT EXISTS medcang_erlaubnis                  TEXT,   -- Erlaubnisnummer
  ADD COLUMN IF NOT EXISTS medcang_erlaubnis_gueltig          DATE,
  ADD COLUMN IF NOT EXISTS medcang_behoerde                   TEXT,   -- ausstellende Behörde
  ADD COLUMN IF NOT EXISTS btm_erlaubnis                      TEXT,
  ADD COLUMN IF NOT EXISTS btm_erlaubnis_gueltig               DATE,
  ADD COLUMN IF NOT EXISTS apotheken_ik                        TEXT,   -- IK-Nummer, falls Apotheke
  ADD COLUMN IF NOT EXISTS grosshandels_erlaubnis              TEXT,   -- §52a AMG
  ADD COLUMN IF NOT EXISTS amg_herstellungserlaubnis           TEXT,   -- §13 AMG
  ADD COLUMN IF NOT EXISTS amg_herstellungserlaubnis_gueltig   DATE,
  ADD COLUMN IF NOT EXISTS gdp_zertifikat                      TEXT,
  ADD COLUMN IF NOT EXISTS gdp_zertifikat_gueltig              DATE;

-- Index für den Erlaubnis-Monitor / Dashboard-Ablaufwarnungen
CREATE INDEX IF NOT EXISTS idx_partner_erlaubnis_ablauf
  ON geschaeftspartner (medcang_erlaubnis_gueltig, btm_erlaubnis_gueltig, gdp_zertifikat_gueltig)
  WHERE aktiv = true;

-- ── CHARGEN: Chargenverwaltung mit CoA ──────────────────────────────────
-- Quelle: MedCanG.jsx (Tabellenspalten chargennr, mhd, thc_analysiert,
-- cbd_analysiert, analysezertifikat_path, gesperrt) + MedCanGPharma.jsx
-- (status, freigabe_datum, freigabe_durch).
--
-- Hinweis: MedCanGPharma.jsx Zeile 65 liest defensiv "charge.charge_nr
-- || charge.chargennr" — im Originalcode also ein Altlast-Alias.
-- Hier wird EIN kanonischer Name verwendet: chargennr.
CREATE TABLE IF NOT EXISTS chargen (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artikel_id             UUID REFERENCES artikel(id),
  chargennr              TEXT NOT NULL,
  pzn                    TEXT,             -- optionaler Charge-Override, sonst artikel.pzn
  bestand                NUMERIC(15,4) DEFAULT 0,
  mhd                    DATE,             -- Mindesthaltbarkeitsdatum
  thc_analysiert         NUMERIC(5,2),     -- tatsächlich gemessener Wert (CoA)
  cbd_analysiert         NUMERIC(5,2),
  analysezertifikat_path TEXT,             -- Pfad/URL zum CoA-Dokument in Supabase Storage
  gesperrt               BOOLEAN DEFAULT false,
  status                 TEXT DEFAULT 'entwurf', -- entwurf | in_pruefung | freigegeben | gesperrt
  freigabe_datum         DATE,
  freigabe_durch         UUID REFERENCES erp_users(id),
  created_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chargen_artikel ON chargen(artikel_id);
CREATE INDEX IF NOT EXISTS idx_chargen_status ON chargen(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chargen_nr ON chargen(chargennr);

ALTER TABLE chargen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read chargen" ON chargen
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write chargen" ON chargen
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- Bekannte Lücke (bewusst nicht automatisiert, siehe Chat):
-- Verkauf.jsx/Einkauf.jsx wählen aktuell keine konkrete Charge pro
-- Position aus — btm_buch-Einträge werden daher mit charge_id = NULL
-- angelegt (Bewegung ist artikelgenau, aber nicht chargengenau belegt).
-- Für lückenlose Chargenrückverfolgung im BtM-Buch wäre eine
-- Chargen-Auswahl in der Verkaufs-/Einkaufsposition nötig — das ist
-- ein UI-Feature, kein Schema-Thema, und noch offen.
-- ============================================================
