-- ============================================================
-- Clavissimo – SQL Teil 7: Rollenbasierte RLS + Unveränderlichkeit
-- ============================================================
-- Ersetzt die bisherigen "jeder eingeloggte Nutzer darf alles"-Policies
-- durch echte Rollenprüfung (readonly < user < manager < admin), und
-- macht btm_buch, artikelbewegungen und gobd_protokoll unveränderlich
-- (keine UPDATE/DELETE-Policy = in Postgres per RLS automatisch verboten,
-- auch für Admins über die normale API — nur Korrekturbuchungen erlaubt).
--
-- Nach 01–06 ausführen.
-- ============================================================

-- ── Rollen-Helferfunktionen ────────────────────────────────────────────
-- SECURITY DEFINER, damit die Abfrage auf erp_users nicht selbst wieder
-- durch RLS blockiert wird (sonst Henne-Ei-Problem).
CREATE OR REPLACE FUNCTION erp_role() RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM erp_users WHERE auth_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION erp_role_level() RETURNS INTEGER
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE erp_role()
    WHEN 'admin'    THEN 3
    WHEN 'manager'  THEN 2
    WHEN 'user'     THEN 1
    WHEN 'readonly' THEN 0
    ELSE -1  -- kein erp_users-Eintrag -> kein Zugriff
  END
$$;

-- ── Alte pauschale Policies entfernen ───────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'erp_users','konten','geschaeftspartner','artikel','artikelbewegungen',
    'buchungen','verkaufsbelege','verkauf_positionen','einkaufsbelege',
    'einkauf_positionen','offene_posten','zahlungen','zahlung_op_zuordnung',
    'gobd_perioden','gobd_protokoll','erp_module','einstellungen',
    'einheiten','artikel_kategorien','sorten','medcang_kategorien',
    'amg_kategorien','gmp_klassen','temperaturklassen'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all_%s" ON %I', t, t);
  END LOOP;

  -- Diese hatten abweichende Namen aus 02/03
  DROP POLICY IF EXISTS "Authenticated read chargen" ON chargen;
  DROP POLICY IF EXISTS "Authenticated write chargen" ON chargen;
  DROP POLICY IF EXISTS "Authenticated read btm_buch" ON btm_buch;
  DROP POLICY IF EXISTS "Authenticated write btm_buch" ON btm_buch;
  DROP POLICY IF EXISTS "Authenticated read btm_meldungen" ON btm_meldungen;
  DROP POLICY IF EXISTS "Authenticated write btm_meldungen" ON btm_meldungen;
  DROP POLICY IF EXISTS "Authenticated read erlaubnis_warnungen" ON erlaubnis_warnungen;
  DROP POLICY IF EXISTS "Authenticated write erlaubnis_warnungen" ON erlaubnis_warnungen;
END $$;

-- ── Kategorie 1: Stammdaten ──────────────────────────────────────────────
-- Lesen: jeder eingeloggte erp_user (auch readonly). Schreiben: ab 'user'.
-- Löschen: nur admin (in der App wird ohnehin nur aktiv/inaktiv umgeschaltet).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'artikel','geschaeftspartner','konten','chargen','einheiten',
    'artikel_kategorien','sorten','medcang_kategorien','amg_kategorien',
    'gmp_klassen','temperaturklassen'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "stamm_select_%s" ON %I FOR SELECT USING (erp_role_level() >= 0)', t, t);
    EXECUTE format('CREATE POLICY "stamm_insert_%s" ON %I FOR INSERT WITH CHECK (erp_role_level() >= 1)', t, t);
    EXECUTE format('CREATE POLICY "stamm_update_%s" ON %I FOR UPDATE USING (erp_role_level() >= 1)', t, t);
    EXECUTE format('CREATE POLICY "stamm_delete_%s" ON %I FOR DELETE USING (erp_role_level() >= 3)', t, t);
  END LOOP;
END $$;

-- ── Kategorie 2: Belege (Verkauf/Einkauf/Mahnwesen) ──────────────────────
-- Lesen: jeder. Anlegen/Ändern: ab 'user'. Löschen: nur admin (Storno ist
-- der eigentlich vorgesehene Weg, Hard-Delete bleibt Notfall-Werkzeug).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'verkaufsbelege','verkauf_positionen','einkaufsbelege','einkauf_positionen',
    'offene_posten','zahlungen','zahlung_op_zuordnung','btm_meldungen','erlaubnis_warnungen'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "beleg_select_%s" ON %I FOR SELECT USING (erp_role_level() >= 0)', t, t);
    EXECUTE format('CREATE POLICY "beleg_insert_%s" ON %I FOR INSERT WITH CHECK (erp_role_level() >= 1)', t, t);
    EXECUTE format('CREATE POLICY "beleg_update_%s" ON %I FOR UPDATE USING (erp_role_level() >= 1)', t, t);
    EXECUTE format('CREATE POLICY "beleg_delete_%s" ON %I FOR DELETE USING (erp_role_level() >= 3)', t, t);
  END LOOP;
END $$;

-- ── Kategorie 3: Buchungen (GoBD) ─────────────────────────────────────────
-- Ändern nur solange NICHT festgeschrieben, und nur ab 'manager'.
-- USING prüft die Zeile VOR der Änderung (nur unveränderte Buchungen
-- sind überhaupt änderbar), WITH CHECK prüft die Zeile NACH der Änderung
-- und verlangt nur noch die Rolle — sonst würde das Festschreiben selbst
-- (festgeschrieben: false -> true) von der eigenen Policy blockiert.
-- Kein DELETE, niemals (auch nicht für Admins) — Storno statt Löschen.
CREATE POLICY "buchungen_select" ON buchungen FOR SELECT USING (erp_role_level() >= 0);
CREATE POLICY "buchungen_insert" ON buchungen FOR INSERT WITH CHECK (erp_role_level() >= 1);
CREATE POLICY "buchungen_update" ON buchungen FOR UPDATE
  USING (erp_role_level() >= 2 AND festgeschrieben = false)
  WITH CHECK (erp_role_level() >= 2);

-- ── Kategorie 4: Unveränderliche Protokolle ───────────────────────────────
-- btm_buch (§13 BtMVV), artikelbewegungen, gobd_protokoll: NUR Lesen und
-- Anlegen. Keine UPDATE/DELETE-Policy = Postgres verbietet es automatisch,
-- für JEDE Rolle inkl. Admin (über die normale API — nicht umgehbar ohne
-- direkten DB-Zugriff mit erweiterten Rechten).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['btm_buch','artikelbewegungen','gobd_protokoll']
  LOOP
    EXECUTE format('CREATE POLICY "unveraenderlich_select_%s" ON %I FOR SELECT USING (erp_role_level() >= 0)', t, t);
    EXECUTE format('CREATE POLICY "unveraenderlich_insert_%s" ON %I FOR INSERT WITH CHECK (erp_role_level() >= 1)', t, t);
  END LOOP;
END $$;

-- Korrekturbuchungs-Referenz: statt eines fehlerhaften btm_buch-Eintrags
-- eine neue Zeile anlegen, die per storno_von auf die falsche verweist.
ALTER TABLE btm_buch ADD COLUMN IF NOT EXISTS storno_von UUID REFERENCES btm_buch(id);

-- ── Kategorie 5: System (Module, Einstellungen, GoBD-Perioden) ───────────
-- Lesen: jeder. Schreiben: nur admin.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['erp_module','einstellungen','gobd_perioden']
  LOOP
    EXECUTE format('CREATE POLICY "system_select_%s" ON %I FOR SELECT USING (erp_role_level() >= 0)', t, t);
    EXECUTE format('CREATE POLICY "system_write_%s" ON %I FOR INSERT WITH CHECK (erp_role_level() >= 3)', t, t);
    EXECUTE format('CREATE POLICY "system_update_%s" ON %I FOR UPDATE USING (erp_role_level() >= 3)', t, t);
  END LOOP;
END $$;

-- ── erp_users: eigene Zeile immer sichtbar, Admin sieht/verwaltet alle ──
CREATE POLICY "erp_users_select" ON erp_users FOR SELECT
  USING (auth_id = auth.uid() OR erp_role_level() >= 3);
CREATE POLICY "erp_users_insert" ON erp_users FOR INSERT
  WITH CHECK (erp_role_level() >= 3);
CREATE POLICY "erp_users_update" ON erp_users FOR UPDATE
  USING (auth_id = auth.uid() OR erp_role_level() >= 3);
-- Kein DELETE — Nutzer werden nicht gelöscht, sondern (falls benötigt)
-- über eine künftige aktiv-Spalte deaktiviert.

-- ============================================================
-- WICHTIG: Diese Policies greifen für den 'authenticated'-API-Zugriff
-- (also die normale App über den Anon-Key + Nutzer-Login). Der
-- Service-Role-Key (nur serverseitig im Proxy, siehe Nutzerverwaltung)
-- umgeht RLS grundsätzlich — das ist so vorgesehen und muss serverseitig
-- bleiben, niemals im Frontend verwendet werden.
-- ============================================================
