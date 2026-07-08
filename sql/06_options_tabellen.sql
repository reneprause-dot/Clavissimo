-- ============================================================
-- Clavissimo – SQL Teil 6: Editierbare Optionslisten für Artikel
-- Nach 01–05 ausführen. Ersetzt Freitext durch Dropdowns in Lager.jsx
-- für: Kategorie, Sorte, MedCanG-Kategorie, AMG-Kategorie, GMP-Klasse,
-- Temperaturklasse. Werte bleiben TEXT in der artikel-Tabelle (keine
-- FK-Umstellung nötig) — die Optionslisten liefern nur die Auswahl.
-- Verwaltbar über Einstellungen → Stammdaten-Listen (Admin).
-- ============================================================

CREATE TABLE IF NOT EXISTS artikel_kategorien (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bezeichnung TEXT UNIQUE NOT NULL,
  aktiv       BOOLEAN DEFAULT true,
  sortierung  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sorten (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bezeichnung TEXT UNIQUE NOT NULL,
  aktiv       BOOLEAN DEFAULT true,
  sortierung  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS medcang_kategorien (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bezeichnung TEXT UNIQUE NOT NULL,
  aktiv       BOOLEAN DEFAULT true,
  sortierung  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS amg_kategorien (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bezeichnung TEXT UNIQUE NOT NULL,
  aktiv       BOOLEAN DEFAULT true,
  sortierung  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gmp_klassen (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bezeichnung TEXT UNIQUE NOT NULL,
  aktiv       BOOLEAN DEFAULT true,
  sortierung  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS temperaturklassen (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bezeichnung TEXT UNIQUE NOT NULL,
  aktiv       BOOLEAN DEFAULT true,
  sortierung  INTEGER DEFAULT 0
);

-- RLS: gleiches Muster wie bei allen anderen Tabellen
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'artikel_kategorien','sorten','medcang_kategorien',
    'amg_kategorien','gmp_klassen','temperaturklassen'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_all_%s" ON %I FOR ALL USING (auth.role() = ''authenticated'')',
      t, t
    );
  END LOOP;
END $$;

-- ── Startwerte ────────────────────────────────────────────────────────────
INSERT INTO artikel_kategorien (bezeichnung, sortierung) VALUES
  ('Cannabisblüten', 10), ('Cannabisextrakte', 20), ('Fertigarzneimittel', 30), ('Zubehör', 40)
ON CONFLICT (bezeichnung) DO NOTHING;

INSERT INTO sorten (bezeichnung, sortierung) VALUES
  ('Bedrocan', 10), ('Bediol', 20), ('Bedrolite', 30),
  ('Pedanios 22/1', 40), ('Aurora 20/1', 50), ('Tilray THC18', 60)
ON CONFLICT (bezeichnung) DO NOTHING;

INSERT INTO medcang_kategorien (bezeichnung, sortierung) VALUES
  ('Blüte getrocknet', 10), ('Extrakt', 20), ('Öl', 30), ('Kapseln', 40), ('Fertigarzneimittel', 50)
ON CONFLICT (bezeichnung) DO NOTHING;

INSERT INTO amg_kategorien (bezeichnung, sortierung) VALUES
  ('Rezepturarzneimittel (BtMG)', 10),
  ('Zugelassenes Fertigarzneimittel (§21 AMG)', 20),
  ('Nicht zugelassen / Sonstiges', 30)
ON CONFLICT (bezeichnung) DO NOTHING;

INSERT INTO gmp_klassen (bezeichnung, sortierung) VALUES
  ('GMP Teil I', 10), ('GMP Teil II', 20), ('Kein GMP erforderlich', 30)
ON CONFLICT (bezeichnung) DO NOTHING;

INSERT INTO temperaturklassen (bezeichnung, sortierung) VALUES
  ('Raumtemperatur (15–25°C, vor Licht geschützt)', 10),
  ('Kühlkette 2–8°C', 20),
  ('Tiefkühl (-18°C)', 30)
ON CONFLICT (bezeichnung) DO NOTHING;
