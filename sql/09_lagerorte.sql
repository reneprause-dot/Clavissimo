-- ============================================================
-- Clavissimo – SQL Teil 9: Lagerorte (WMS)
-- Nach 01–08 ausführen. artikel.lagerort bleibt als Freitext-Spalte
-- bestehen (Altdaten/Kompatibilität), wird aber in der UI ab jetzt per
-- Dropdown aus lagerorte befüllt. chargen bekommt zusätzlich eine echte
-- Referenz für die Chargenrückverfolgung je Lagerort.
-- ============================================================

CREATE TABLE IF NOT EXISTS lagerorte (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,     -- kurz, z.B. 'KR-A-1'
  bezeichnung TEXT NOT NULL,            -- z.B. 'Kühlraum A / Fach 1'
  typ         TEXT DEFAULT 'standard',  -- standard | kuehlraum | tresor | quarantaene
  aktiv       BOOLEAN DEFAULT true,
  sortierung  INTEGER DEFAULT 0
);

ALTER TABLE lagerorte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stamm_select_lagerorte" ON lagerorte FOR SELECT USING (erp_role_level() >= 0);
CREATE POLICY "stamm_insert_lagerorte" ON lagerorte FOR INSERT WITH CHECK (erp_role_level() >= 1);
CREATE POLICY "stamm_update_lagerorte" ON lagerorte FOR UPDATE USING (erp_role_level() >= 1);
CREATE POLICY "stamm_delete_lagerorte" ON lagerorte FOR DELETE USING (erp_role_level() >= 3);

-- Chargenrückverfolgung: welche Charge liegt an welchem Lagerort
ALTER TABLE chargen ADD COLUMN IF NOT EXISTS lagerort_id UUID REFERENCES lagerorte(id);
CREATE INDEX IF NOT EXISTS idx_chargen_lagerort ON chargen(lagerort_id);

-- Startwerte (an die Beispieldaten aus 05 angelehnt — passt auch ohne sie)
INSERT INTO lagerorte (code, bezeichnung, typ, sortierung) VALUES
  ('KR-A-1', 'Kühlraum A / Fach 1', 'kuehlraum', 10),
  ('KR-A-2', 'Kühlraum A / Fach 2', 'kuehlraum', 20),
  ('KR-A-3', 'Kühlraum A / Fach 3', 'kuehlraum', 30),
  ('KR-A-4', 'Kühlraum A / Fach 4', 'kuehlraum', 40),
  ('KR-A-5', 'Kühlraum A / Fach 5', 'kuehlraum', 50),
  ('KR-A-6', 'Kühlraum A / Fach 6', 'kuehlraum', 60),
  ('KR-B-EX', 'Kühlraum B / Extrakte', 'kuehlraum', 70),
  ('SCHRANK-C-1', 'Schrank C (verschließbar) / Fach 1', 'tresor', 80),
  ('QUARANTAENE', 'Quarantänelager', 'quarantaene', 90)
ON CONFLICT (code) DO NOTHING;
