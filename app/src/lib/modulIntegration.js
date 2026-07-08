/**
 * Clavissimo – Modul-Integration (Platzhalter-Stub)
 * ============================================================
 * Clavissimo hat (bewusst, siehe CLAVISSIMO_SPEC.md) keine
 * Mehrbranchen-Integrationsmatrix wie Clavis ERP. Damit die
 * bestehenden Aufrufe in MedCanGPharma.jsx und Verkauf.jsx trotzdem
 * funktionieren, ist hier ein minimaler, ungefährlicher Stub:
 *
 *   - triggerEvent(...)   protokolliert nur in der Konsole, tut sonst nichts.
 *   - hatBlockierung(...) gibt immer "keine Blockierung" zurück.
 *
 * Wenn du echte modulübergreifende Automatisierung willst (z.B.
 * "Charge freigegeben → automatisch Buchungssatz erzeugen"), ersetze
 * diese Datei durch eine echte Implementierung oder erweitere die
 * Funktionen unten gezielt für die Fälle, die du brauchst.
 * ============================================================
 */

export const EVENTS = {
  CHARGE_ERSTELLT:   'charge_erstellt',
  CHARGE_FREIGEGEBEN: 'charge_freigegeben',
  CHARGE_GESPERRT:    'charge_gesperrt',
  VERKAUF_GEBUCHT:    'verkauf_gebucht',
  EINKAUF_GEBUCHT:    'einkauf_gebucht',
}

export async function triggerEvent(event, payload = {}, context = {}) {
  console.info(`[modulIntegration] Event: ${event}`, payload)
  return { ok: true, handled: false }
}

/**
 * Prüft, ob eine Aktion aufgrund einer Compliance-Regel blockiert werden
 * soll (z.B. "Verkauf an Partner ohne gültige Erlaubnis"). Im Stub immer
 * "nicht blockiert" — die eigentliche Erlaubnisprüfung läuft bei
 * Clavissimo direkt in Verkauf.jsx / MedCanG.jsx (pruefeErlaubnis siehe
 * CLAVISSIMO_SPEC.md), nicht über dieses generische Event-System.
 */
export async function hatBlockierung(event, payload = {}) {
  return { blockiert: false, gruende: [] }
}

export const HANDLER_REGISTRY = []
