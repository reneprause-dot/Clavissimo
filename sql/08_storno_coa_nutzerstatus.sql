-- ============================================================
-- Clavissimo – SQL Teil 8: Storno-Felder, Nutzer-Status, CoA-Storage
-- Nach 01–07 ausführen.
-- ============================================================

-- ── Storno-Felder auf verkaufsbelege ─────────────────────────────────────
ALTER TABLE verkaufsbelege
  ADD COLUMN IF NOT EXISTS storniert     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS storno_belegnr TEXT,
  ADD COLUMN IF NOT EXISTS storno_grund   TEXT,
  ADD COLUMN IF NOT EXISTS storniert_von  UUID REFERENCES erp_users(id),
  ADD COLUMN IF NOT EXISTS storniert_am   TIMESTAMPTZ;

-- ── Nutzer-Deaktivierung (statt Löschen) ─────────────────────────────────
ALTER TABLE erp_users ADD COLUMN IF NOT EXISTS aktiv BOOLEAN DEFAULT true;

-- ── CoA-Dokumente: privater Storage-Bucket ───────────────────────────────
-- Supabase legt Buckets über die Tabelle storage.buckets an (funktioniert
-- auch per SQL-Editor, alternativ Dashboard -> Storage -> New Bucket).
INSERT INTO storage.buckets (id, name, public)
VALUES ('coa-dokumente', 'coa-dokumente', false)
ON CONFLICT (id) DO NOTHING;

-- Zugriff: jeder eingeloggte erp_user darf hochladen/lesen (gleiche Logik
-- wie die übrigen Stammdaten — Details siehe erp_role_level()).
DROP POLICY IF EXISTS "coa_select" ON storage.objects;
DROP POLICY IF EXISTS "coa_insert" ON storage.objects;
CREATE POLICY "coa_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'coa-dokumente' AND erp_role_level() >= 0);
CREATE POLICY "coa_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'coa-dokumente' AND erp_role_level() >= 1);
