-- ============================================================
-- Clavissimo – SQL Teil 4: Einheiten-Stammdaten
-- Nach 01–03 ausführen. Wird von Lager.jsx (Artikelkarte) per
-- Dropdown genutzt statt eines Freitextfelds für "Einheit".
-- ============================================================

CREATE TABLE IF NOT EXISTS einheiten (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,   -- Kurzform, wird in artikel.einheit gespeichert
  bezeichnung TEXT NOT NULL,
  aktiv       BOOLEAN DEFAULT true,
  sortierung  INTEGER DEFAULT 0
);

ALTER TABLE einheiten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_einheiten" ON einheiten
  FOR ALL USING (auth.role() = 'authenticated');

-- Vorbefüllung: für Cannabis-Großhandel/Herstellung übliche Einheiten.
-- ON CONFLICT DO NOTHING, damit ein erneutes Ausführen nicht crasht.
INSERT INTO einheiten (code, bezeichnung, sortierung) VALUES
  ('g',   'Gramm',      10),
  ('kg',  'Kilogramm',  20),
  ('Stk', 'Stück',      30),
  ('ml',  'Milliliter', 40),
  ('l',   'Liter',      50),
  ('Packung', 'Packung', 60),
  ('Flasche', 'Flasche', 70),
  ('Dose', 'Dose',       80)
ON CONFLICT (code) DO NOTHING;
