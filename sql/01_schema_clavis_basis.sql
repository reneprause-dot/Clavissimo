-- ============================================================
-- Clavissimo – SQL Teil 1: Echtes Basis-Schema
-- ============================================================
-- ERSETZT die bisherige Kommentar-only-Version. Alle Felder sind aus
-- den tatsächlichen .select()/.insert()/.update()-Aufrufen in
-- buchungslogik.js, Lager.jsx, Verkauf.jsx und Einkauf.jsx extrahiert.
-- Nach dieser Datei: 02_clavissimo_neu.sql, dann 03_medcang_integration.sql.
--
-- Nicht enthalten (noch keine UI/Queries dafür vorhanden, bei Bedarf
-- separat ergänzen): mandanten, nummernserien, qm_dokumente,
-- qm_schulungen, qm_schulungsnachweise, temperatur_protokoll,
-- temperatur_zonen (eQMS-Modul — noch nicht gebaut).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── erp_users ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id    UUID REFERENCES auth.users(id),
  name       TEXT,
  email      TEXT,
  role       TEXT DEFAULT 'user',  -- admin | manager | user | readonly
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── konten (SKR04) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS konten (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nummer      TEXT UNIQUE NOT NULL,
  bezeichnung TEXT NOT NULL,
  saldo       NUMERIC(15,2) DEFAULT 0,
  aktiv       BOOLEAN DEFAULT true
);

-- ── geschaeftspartner (MedCanG-Felder kommen in 03_medcang_integration.sql) ──
CREATE TABLE IF NOT EXISTS geschaeftspartner (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  typ            TEXT NOT NULL DEFAULT 'kunde',  -- kunde | lieferant | beide
  email          TEXT,
  kundennr       TEXT,
  strasse        TEXT,
  plz            TEXT,
  ort            TEXT,
  zahlungsziel   INTEGER DEFAULT 14,
  skonto_prozent NUMERIC(5,2) DEFAULT 0,
  skonto_tage    INTEGER DEFAULT 0,
  op_saldo       NUMERIC(15,2) DEFAULT 0,
  aktiv          BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── artikel (MedCanG-Felder kommen in 03_medcang_integration.sql) ────────
CREATE TABLE IF NOT EXISTS artikel (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artikelnr      TEXT UNIQUE NOT NULL,
  bezeichnung    TEXT NOT NULL,
  beschreibung   TEXT,
  einheit        TEXT DEFAULT 'Stk',
  kategorie      TEXT,
  einkaufspreis  NUMERIC(15,2) DEFAULT 0,
  verkaufspreis  NUMERIC(15,2) DEFAULT 0,
  mwst_satz      NUMERIC(5,2) DEFAULT 19,
  bestand        NUMERIC(15,4) DEFAULT 0,
  bestand_wert   NUMERIC(15,2) DEFAULT 0,   -- gleitender Durchschnittswert, siehe buchungslogik.js
  mindestbestand NUMERIC(15,4) DEFAULT 0,
  lagerort       TEXT,
  aktiv          BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── artikelbewegungen ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artikelbewegungen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artikel_id      UUID REFERENCES artikel(id),
  datum           DATE NOT NULL,
  typ             TEXT NOT NULL,  -- zugang | abgang | fertigung_zugang | ...
  menge           NUMERIC(15,4) NOT NULL,
  einstandspreis  NUMERIC(15,2) DEFAULT 0,
  gesamtwert      NUMERIC(15,2) DEFAULT 0,
  bestand_vorher  NUMERIC(15,4),
  bestand_nachher NUMERIC(15,4),
  referenz_typ    TEXT,
  referenz_id     UUID,
  beschreibung    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── buchungen (GoBD) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buchungen (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  belegnr        TEXT,
  datum          DATE NOT NULL,
  beschreibung   TEXT,
  soll_konto_id  UUID REFERENCES konten(id),
  haben_konto_id UUID REFERENCES konten(id),
  betrag         NUMERIC(15,2) NOT NULL,
  steuercode     TEXT,
  steuerbetrag   NUMERIC(15,2) DEFAULT 0,
  festgeschrieben BOOLEAN DEFAULT false,
  erstellt_von   UUID REFERENCES erp_users(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── verkaufsbelege ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verkaufsbelege (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  belegnr          TEXT NOT NULL,
  typ              TEXT NOT NULL,  -- angebot | auftrag | lieferschein | rechnung | gutschrift
  kunde_id         UUID REFERENCES geschaeftspartner(id),
  datum            DATE NOT NULL,
  lieferdatum      DATE,
  faelligkeitsdatum DATE,
  referenz_id      UUID,           -- verweist auf vorherigen Beleg (z.B. Auftrag -> Angebot)
  referenz_belegnr TEXT,
  nettobetrag      NUMERIC(15,2) DEFAULT 0,
  steuerbetrag     NUMERIC(15,2) DEFAULT 0,
  bruttobetrag     NUMERIC(15,2) DEFAULT 0,
  status           TEXT DEFAULT 'offen',
  buchungs_id      UUID REFERENCES buchungen(id),
  op_id            UUID,
  notizen          TEXT,
  erstellt_von     UUID REFERENCES erp_users(id),
  gebucht_am       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── verkauf_positionen ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verkauf_positionen (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beleg_id     UUID REFERENCES verkaufsbelege(id) ON DELETE CASCADE,
  artikel_id   UUID REFERENCES artikel(id),
  bezeichnung  TEXT,
  menge        NUMERIC(15,4) NOT NULL DEFAULT 1,
  einheit      TEXT DEFAULT 'Stk',
  einzelpreis  NUMERIC(15,2) DEFAULT 0,
  mwst_satz    NUMERIC(5,2) DEFAULT 19,
  nettobetrag  NUMERIC(15,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── einkaufsbelege ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS einkaufsbelege (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  belegnr                  TEXT NOT NULL,
  typ                      TEXT NOT NULL,  -- bestellung | wareneingang | rechnung
  lieferant_id             UUID REFERENCES geschaeftspartner(id),
  datum                    DATE NOT NULL,
  lieferdatum              DATE,
  lieferscheinnr           TEXT,
  lieferantenrechnungsnr   TEXT,
  faelligkeitsdatum        DATE,
  nettobetrag              NUMERIC(15,2) DEFAULT 0,
  steuerbetrag             NUMERIC(15,2) DEFAULT 0,
  bruttobetrag             NUMERIC(15,2) DEFAULT 0,
  status                   TEXT DEFAULT 'offen',
  op_id                    UUID,
  notizen                  TEXT,
  erstellt_von             UUID REFERENCES erp_users(id),
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- ── einkauf_positionen ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS einkauf_positionen (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beleg_id     UUID REFERENCES einkaufsbelege(id) ON DELETE CASCADE,
  artikel_id   UUID REFERENCES artikel(id),
  bezeichnung  TEXT,
  menge        NUMERIC(15,4) NOT NULL DEFAULT 1,
  einheit      TEXT DEFAULT 'Stk',
  einzelpreis  NUMERIC(15,2) DEFAULT 0,
  mwst_satz    NUMERIC(5,2) DEFAULT 19,
  nettobetrag  NUMERIC(15,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── offene_posten (Mahnwesen) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offene_posten (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ               TEXT NOT NULL,  -- debitor | kreditor
  partner_id        UUID REFERENCES geschaeftspartner(id),
  beleg_id          UUID,
  beleg_typ         TEXT,
  belegnr           TEXT,
  datum             DATE,
  faelligkeitsdatum DATE,
  betrag            NUMERIC(15,2) NOT NULL,
  offen             NUMERIC(15,2) NOT NULL,
  buchungs_id       UUID REFERENCES buchungen(id),
  status            TEXT DEFAULT 'offen',  -- offen | teilweise_ausgeglichen | ausgeglichen
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── zahlungen ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zahlungen (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum             DATE NOT NULL,
  partner_id        UUID REFERENCES geschaeftspartner(id),
  zahlungsart       TEXT,
  betrag            NUMERIC(15,2) NOT NULL,
  verwendungszweck  TEXT,
  buchungs_id       UUID REFERENCES buchungen(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zahlung_op_zuordnung (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zahlung_id UUID REFERENCES zahlungen(id),
  op_id      UUID REFERENCES offene_posten(id),
  betrag     NUMERIC(15,2) NOT NULL
);

-- ── gobd_perioden / gobd_protokoll ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gobd_perioden (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periode             TEXT UNIQUE NOT NULL,  -- 'JJJJ-MM'
  typ                 TEXT DEFAULT 'monat',
  festgeschrieben     BOOLEAN DEFAULT false,
  festgeschrieben_am  TIMESTAMPTZ,
  festgeschrieben_von UUID REFERENCES erp_users(id),
  anzahl_buchungen    INTEGER DEFAULT 0,
  hash_gesamt         TEXT
);

CREATE TABLE IF NOT EXISTS gobd_protokoll (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aktion      TEXT,
  details     JSONB,
  erstellt_at TIMESTAMPTZ DEFAULT now()
);

-- ── System: Module & Einstellungen ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_module (
  modul_key   TEXT PRIMARY KEY,
  bezeichnung TEXT,
  aktiv       BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS einstellungen (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ============================================================
-- Row Level Security: alle Tabellen für eingeloggte Nutzer offen.
-- Für produktiven Einsatz ggf. auf Rollen (admin/manager/user/readonly)
-- verfeinern — aktuell regelt Clavissimo Rechte auf App-Ebene (hasRole()),
-- nicht per granularer RLS-Policy pro Tabelle.
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'erp_users','konten','geschaeftspartner','artikel','artikelbewegungen',
    'buchungen','verkaufsbelege','verkauf_positionen','einkaufsbelege',
    'einkauf_positionen','offene_posten','zahlungen','zahlung_op_zuordnung',
    'gobd_perioden','gobd_protokoll','erp_module','einstellungen'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_all_%s" ON %I FOR ALL USING (auth.role() = ''authenticated'')',
      t, t
    );
  END LOOP;
END $$;
