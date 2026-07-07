/**
 * Clavissimo – Modul-Integration
 * ============================================================
 * Das ist die tatsächliche Umsetzung dessen, was in Clavis ERP über
 * eine generische Event-/Handler-Registry lief: Verkauf.jsx feuert bei
 * jedem neuen Beleg EVENTS.VERKAUF_BELEG_ERSTELLT, MedCanGPharma.jsx
 * feuert bei Chargen-Freigabe/-Sperrung. Für Clavissimo (eine Branche,
 * kein Multi-Modul-Marktplatz) ist die generische Registry durch
 * direkte, klar benannte Prüfungen ersetzt — funktional gleichwertig,
 * aber ohne die Overhead-Abstraktion für 42 Branchen.
 *
 * WICHTIG zur Aufrufkonvention (aus Verkauf.jsx übernommen, nicht
 * verändern): triggerEvent() ist async, hatBlockierung() ist es NICHT.
 * Verkauf.jsx ruft `if (hatBlockierung(integErg))` ohne await auf —
 * hatBlockierung muss daher synchron auf dem bereits aufgelösten
 * triggerEvent()-Ergebnis arbeiten, nicht selbst nachladen.
 * ============================================================
 */
import { pruefeErlaubnis } from './medcangCompliance'
import { logAudit } from './auditTrail'

export const EVENTS = {
  VERKAUF_BELEG_ERSTELLT: 'verkauf_beleg_erstellt',
  CHARGE_FREIGEGEBEN:     'charge_freigegeben',
  CHARGE_GESPERRT:        'charge_gesperrt',
}

/**
 * @param {string} event - einer der EVENTS-Werte
 * @param {object} payload - event-spezifische Daten
 * @param {object} context - z.B. { activeModules, erpUser }
 * @returns {{ blockiert: boolean, gruende: string[] }}
 */
export async function triggerEvent(event, payload = {}, context = {}) {
  switch (event) {
    case EVENTS.VERKAUF_BELEG_ERSTELLT: {
      const { erlaubt, warnungen } = await pruefeErlaubnis(payload.kundeId)
      return { blockiert: !erlaubt, gruende: warnungen }
    }

    case EVENTS.CHARGE_FREIGEGEBEN:
      await logAudit('charge_freigegeben', payload)
      return { blockiert: false, gruende: [] }

    case EVENTS.CHARGE_GESPERRT:
      await logAudit('charge_gesperrt', payload)
      return { blockiert: false, gruende: [] }

    default:
      console.warn(`[modulIntegration] Unbekanntes Event: ${event}`)
      return { blockiert: false, gruende: [] }
  }
}

/**
 * Synchron! Nimmt das bereits aufgelöste Ergebnis von triggerEvent()
 * entgegen (siehe Hinweis oben) — kein eigener DB-Zugriff hier.
 */
export function hatBlockierung(triggerErgebnis) {
  return Boolean(triggerErgebnis?.blockiert)
}

/** Für UI-Anzeige der Blockierungsgründe (z.B. in showMsg). */
export function blockierungsGruende(triggerErgebnis) {
  return triggerErgebnis?.gruende || []
}
