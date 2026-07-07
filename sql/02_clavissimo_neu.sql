-- ============================================================
-- Clavissimo – SQL Teil 2: Neue Tabellen (spezifisch für Clavissimo)
-- Direkt im Supabase SQL-Editor des NEUEN Clavissimo-Projekts ausführen,
-- NACH 01_schema_clavis_basis.sql.
-- ============================================================

-- BtM-Buchführungspflicht (§13 BtMVV)
CREATE TABLE IF NOT EXISTS btm_buch (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ                  TEXT NOT NULL,   -- 'zugang' | 'abgang'
  datum                DATE NOT NULL,
  charge_id            UUID REFERENCES chargen(id),
  artikel_id           UUID REFERENCES artikel(id),
  menge                NUMERIC(15,4) NOT NULL,
  einheit              TEXT,
  partner_id           UUID REFERENCES geschaeftspartner(id),
  belegnr              TEXT,
  empfaenger_erlaubnis TEXT,
  bestand_nach         NUMERIC(15,4),
  gebucht_von          UUID REFERENCES erp_users(id),
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Monatliche BtM-Bestandsmeldung
CREATE TABLE IF NOT EXISTS btm_meldungen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monat           TEXT NOT NULL,   -- 'JJJJ-MM'
  status          TEXT DEFAULT 'entwurf',
  bestand_anfang  JSONB,
  zugaenge        NUMERIC(15,4),
  abgaenge        NUMERIC(15,4),
  bestand_ende    JSONB,
  differenz       NUMERIC(15,4),
  gemeldet_am     DATE,
  gemeldet_an     TEXT,
  erstellt_von    UUID REFERENCES erp_users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Erlaubnis-Überwachung (automatische Warnungen)
CREATE TABLE IF NOT EXISTS erlaubnis_warnungen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID REFERENCES geschaeftspartner(id),
  erlaubnis_typ   TEXT NOT NULL,   -- 'medcang' | 'btm' | 'gdp' | 'grosshandel'
  gueltig_bis     DATE NOT NULL,
  warnung_tage    INTEGER DEFAULT 90,
  status          TEXT DEFAULT 'aktiv',
  erstellt_at     TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security aktivieren (Basis — nach Bedarf verfeinern)
ALTER TABLE btm_buch ENABLE ROW LEVEL SECURITY;
ALTER TABLE btm_meldungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE erlaubnis_warnungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read btm_buch" ON btm_buch
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write btm_buch" ON btm_buch
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read btm_meldungen" ON btm_meldungen
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write btm_meldungen" ON btm_meldungen
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read erlaubnis_warnungen" ON erlaubnis_warnungen
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write erlaubnis_warnungen" ON erlaubnis_warnungen
  FOR ALL USING (auth.role() = 'authenticated');
