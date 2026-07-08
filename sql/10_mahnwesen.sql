-- ============================================================
-- Clavissimo – SQL Teil 10: Mahnwesen
-- Nach 01–09 ausführen.
-- ============================================================

ALTER TABLE offene_posten
  ADD COLUMN IF NOT EXISTS mahnstufe INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS letzte_mahnung_am DATE;

-- Protokoll aller versendeten Mahnungen (Nachweis, was wann an wen ging)
CREATE TABLE IF NOT EXISTS mahnungen (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  op_id         UUID REFERENCES offene_posten(id),
  stufe         INTEGER NOT NULL,
  datum         DATE NOT NULL,
  betrag        NUMERIC(15,2) NOT NULL,
  versendet_an  TEXT,
  versandart    TEXT DEFAULT 'druck',  -- druck | email
  erstellt_von  UUID REFERENCES erp_users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mahnungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mahnungen_select" ON mahnungen FOR SELECT USING (erp_role_level() >= 0);
CREATE POLICY "mahnungen_insert" ON mahnungen FOR INSERT WITH CHECK (erp_role_level() >= 1);
-- Kein UPDATE/DELETE — Mahnprotokoll ist wie btm_buch/gobd_protokoll ein
-- Nachweis, der nicht nachträglich verändert werden soll.
