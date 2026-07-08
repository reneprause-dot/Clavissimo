-- ============================================================
-- Clavissimo – Beispieldaten entfernen (VOR Produktivstart ausführen,
-- falls 05_beispieldaten_artikel.sql zu Testzwecken gelaufen ist)
-- ============================================================
-- Sicher: löscht NUR Artikel mit den Test-Artikelnummern-Präfixen aus
-- 05_beispieldaten_artikel.sql. Prüft vorher per SELECT, ob diese
-- Artikel bereits in echten Belegen verwendet wurden — falls ja, bricht
-- das Skript ab (Artikel dann stattdessen per Hand auf inaktiv setzen).

DO $$
DECLARE
  verwendet INTEGER;
BEGIN
  SELECT count(*) INTO verwendet
  FROM verkauf_positionen vp
  JOIN artikel a ON a.id = vp.artikel_id
  WHERE a.artikelnr LIKE 'CAN-%'
  UNION ALL
  SELECT count(*)
  FROM einkauf_positionen ep
  JOIN artikel a ON a.id = ep.artikel_id
  WHERE a.artikelnr LIKE 'CAN-%';

  IF verwendet > 0 THEN
    RAISE EXCEPTION 'Beispielartikel wurden bereits in echten Belegen verwendet — nicht löschen, stattdessen auf inaktiv setzen: UPDATE artikel SET aktiv=false WHERE artikelnr LIKE ''CAN-%%'';';
  END IF;
END $$;

DELETE FROM chargen WHERE artikel_id IN (SELECT id FROM artikel WHERE artikelnr LIKE 'CAN-%');
DELETE FROM artikel WHERE artikelnr LIKE 'CAN-%';
