import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ModuleProvider } from './context/ModuleContext'
import AppLayout from './components/layout/AppLayout'
import SetupScreen from './components/SetupScreen'
import LoginScreen from './components/LoginScreen'

import Dashboard from './modules/Dashboard'
import Lager from './modules/Lager'
import Partnerstamm from './modules/Partnerstamm'
import Einkauf from './modules/Einkauf'
import Verkauf from './modules/Verkauf'
import MedCanG from './modules/MedCanG'
import MedCanGPharma from './modules/MedCanGPharma'
import BtmBuch from './modules/BtmBuch'
import Einstellungen from './modules/Einstellungen'
import Nutzerverwaltung from './modules/Nutzerverwaltung'
import Platzhalter from './modules/Platzhalter'

// Modul-Key → Komponente. Module ohne eigene Oberfläche fallen auf
// Platzhalter zurück (siehe README.md "Noch zu bauen").
const MODULE_COMPONENTS = {
  dashboard: Dashboard,
  artikel: Lager,          // Lager.jsx deckt Artikelstamm-CRUD bereits mit ab
  lager: Lager,
  wms: () => <Platzhalter titel="Lagerverwaltung (WMS)" icon="📍" />,
  einkauf: Einkauf,
  verkauf: Verkauf,
  buchhaltung: () => <Platzhalter titel="Buchungsjournal" icon="📒" />,
  mahnwesen: () => <Platzhalter titel="Mahnwesen" icon="📨" />,
  datev: () => <Platzhalter titel="DATEV Export" icon="📤" />,
  gobd: () => <Platzhalter titel="GoBD-Konformität" icon="🔒" />,
  medcang: MedCanGPharma,
  partner: Partnerstamm,
  btm_buch: BtmBuch,
  erlaubnis_monitor: () => <Platzhalter titel="Erlaubnis-Monitor" icon="📋" />,
  qm: () => <Platzhalter titel="eQMS" icon="✅" />,
  personal: () => <Platzhalter titel="Personal & Zeiterfassung" icon="👤" />,
  einstellungen: Einstellungen,
  nutzerverwaltung: Nutzerverwaltung,
}

function AppInnen() {
  const { configured, loading, user, erpUserFehlt, reconfigure } = useAuth()
  const [currentView, setCurrentView] = useState('dashboard')

  if (!configured) return <SetupScreen onFertig={reconfigure} />
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Lade…</div>
  if (!user) return <LoginScreen />
  if (erpUserFehlt) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger,#B3261E)' }}>
        Dein Login ist gültig, aber es existiert noch kein erp_users-Eintrag für dich.
        Bitte einen Admin bitten, dich anzulegen.
      </div>
    )
  }

  const Modul = MODULE_COMPONENTS[currentView] || (() => <Platzhalter titel={currentView} />)

  return (
    <ModuleProvider>
      <AppLayout currentView={currentView} onNavigate={setCurrentView} onSuche={() => {}}>
        <Modul />
      </AppLayout>
    </ModuleProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInnen />
    </AuthProvider>
  )
}
