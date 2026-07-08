-- ============================================================
-- Clavissimo – SQL Teil 5: Beispieldaten für Artikel (MedCanG)
-- Optional! Nur zum Testen/Vorführen — nach 01–04 ausführen.
-- Deckt drei typische Produktkategorien ab: getrocknete Blüten
-- (verschiedene Sorten/THC-CBD-Verhältnisse), ein Extrakt und ein
-- zugelassenes Fertigarzneimittel (zeigt den Unterschied bei
-- amg_zulassungsnummer — Blüten haben i.d.R. KEINE AMG-Zulassungs-
-- nummer, da sie als Rezepturarzneimittel nach BtMG/AMG §13
-- abgegeben werden, nicht als zugelassenes Fertigarzneimittel).
--
-- ON CONFLICT (artikelnr) DO NOTHING → mehrfaches Ausführen ist sicher.
-- ============================================================

INSERT INTO artikel (
  artikelnr, bezeichnung, beschreibung, einheit, kategorie,
  einkaufspreis, verkaufspreis, mwst_satz, bestand, mindestbestand, lagerort, aktiv,
  pzn, btm_pflichtig, medcang_kategorie, thc_gehalt, cbd_gehalt, sorte,
  amg_zulassungsnummer, amg_kategorie, gmp_klasse, serialisierungspflichtig,
  temperaturklasse, haltbarkeit_tage
) VALUES

-- ── Getrocknete Blüten (THC-dominant) ────────────────────────────────────
('CAN-B-001', 'Bedrocan (Sorte Bedrocan) 22/<1', 'Getrocknete Cannabisblüte, THC-dominant', 'g', 'Cannabisblüten',
 6.20, 11.90, 19, 1200, 200, 'Kühlraum A / Fach 1', true,
 '17543210', true, 'Blüte getrocknet', 22.0, 0.5, 'Bedrocan',
 NULL, 'Rezepturarzneimittel (BtMG)', 'GMP Teil II', true,
 'Raumtemperatur (15–25°C, vor Licht geschützt)', 730),

('CAN-B-002', 'Pedanios 22/1', 'Getrocknete Cannabisblüte, THC-dominant', 'g', 'Cannabisblüten',
 5.90, 11.50, 19, 900, 150, 'Kühlraum A / Fach 2', true,
 '17543211', true, 'Blüte getrocknet', 22.0, 1.0, 'Pedanios 22/1',
 NULL, 'Rezepturarzneimittel (BtMG)', 'GMP Teil II', true,
 'Raumtemperatur (15–25°C, vor Licht geschützt)', 730),

('CAN-B-003', 'Aurora 20/1', 'Getrocknete Cannabisblüte, THC-dominant', 'g', 'Cannabisblüten',
 5.60, 10.90, 19, 750, 150, 'Kühlraum A / Fach 3', true,
 '17543212', true, 'Blüte getrocknet', 20.0, 1.0, 'Aurora 20/1',
 NULL, 'Rezepturarzneimittel (BtMG)', 'GMP Teil II', true,
 'Raumtemperatur (15–25°C, vor Licht geschützt)', 730),

('CAN-B-004', 'Tilray THC 18/1', 'Getrocknete Cannabisblüte, THC-dominant', 'g', 'Cannabisblüten',
 5.40, 10.50, 19, 600, 150, 'Kühlraum A / Fach 4', true,
 '17543213', true, 'Blüte getrocknet', 18.0, 1.0, 'Tilray THC18',
 NULL, 'Rezepturarzneimittel (BtMG)', 'GMP Teil II', true,
 'Raumtemperatur (15–25°C, vor Licht geschützt)', 730),

-- ── Ausgewogene Sorte (THC/CBD gemischt) ─────────────────────────────────
('CAN-B-005', 'Bediol (Sorte Bediol) 6/8', 'Getrocknete Cannabisblüte, ausgewogenes THC/CBD-Verhältnis', 'g', 'Cannabisblüten',
 5.80, 11.20, 19, 500, 100, 'Kühlraum A / Fach 5', true,
 '17543214', true, 'Blüte getrocknet', 6.0, 8.0, 'Bediol',
 NULL, 'Rezepturarzneimittel (BtMG)', 'GMP Teil II', true,
 'Raumtemperatur (15–25°C, vor Licht geschützt)', 730),

-- ── CBD-dominant ──────────────────────────────────────────────────────────
('CAN-B-006', 'Bedrolite (Sorte Bedrolite) <1/9', 'Getrocknete Cannabisblüte, CBD-dominant', 'g', 'Cannabisblüten',
 5.20, 10.20, 19, 400, 100, 'Kühlraum A / Fach 6', true,
 '17543215', true, 'Blüte getrocknet', 0.5, 9.0, 'Bedrolite',
 NULL, 'Rezepturarzneimittel (BtMG)', 'GMP Teil II', true,
 'Raumtemperatur (15–25°C, vor Licht geschützt)', 730),

-- ── Extrakt (Vollspektrum-Öl) ─────────────────────────────────────────────
('CAN-E-001', 'Cannabisextrakt Vollspektrum 25% THC', 'Öliger Vollspektrumextrakt zur oralen Einnahme', 'ml', 'Cannabisextrakte',
 18.50, 34.90, 19, 80, 20, 'Kühlraum B / Extrakte', true,
 '17698310', true, 'Extrakt', 25.0, 1.5, NULL,
 NULL, 'Rezepturarzneimittel (BtMG)', 'GMP Teil II', true,
 'Kühlkette 2–8°C', 365),

-- ── Zugelassenes Fertigarzneimittel (zum Vergleich: HAT eine AMG-Zulassungsnummer) ──
('CAN-F-001', 'Nabiximols Spray 2,7mg/2,5mg', 'Zugelassenes Fertigarzneimittel, Mundschleimhautspray', 'Stk', 'Fertigarzneimittel',
 420.00, 615.00, 19, 25, 5, 'Schrank C (verschließbar) / Fach 1', true,
 '11234567', true, 'Fertigarzneimittel', 2.7, 2.5, NULL,
 '6120689.00.00', 'Zugelassenes Fertigarzneimittel (§21 AMG)', 'GMP Teil I', true,
 'Kühlkette 2–8°C, nach Anbruch max. 3 Monate bei Raumtemperatur', 1095)

ON CONFLICT (artikelnr) DO NOTHING;
