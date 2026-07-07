/**
 * Clavissimo – Storno-Logik (PLATZHALTER — noch aus Clavis ERP zu übernehmen)
 * Storno von Verkaufsbelegen ist compliance-relevant (GoBD: Stornos dürfen
 * Buchungen nicht löschen, nur stornierend gegenbuchen). Deshalb hier
 * bewusst kein Rate-Fantasie-Code, sondern ein klarer Fehler, bis die
 * echte stornoLogik.js aus deinem Clavis-ERP-Repo eingesetzt wird.
 */
export async function storniereVKBeleg(beleg, grund) {
  throw new Error('storniereVKBeleg ist noch nicht implementiert — stornoLogik.js aus Clavis ERP übernehmen.')
}
