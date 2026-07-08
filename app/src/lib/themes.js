/**
 * Clavis ERP – UI Themes
 * 5 vordefinierte Farbvorlagen
 */

export const THEMES = {
  clavis_dark: {
    id: 'clavis_dark',
    name: 'Clavis Dark',
    beschreibung: 'Standard · Dunkel · Teal-Akzent',
    vorschau: ['#0f1117', '#1a1f2e', '#0e7490', '#22d3ee'],
    vars: {
      '--bg-primary':    '#0f1117',
      '--bg-secondary':  '#1a1f2e',
      '--bg-tertiary':   '#0f1519',
      '--border':        '#2d3748',
      '--border-hover':  '#4a5568',
      '--text-primary':  '#e2e8f0',
      '--text-secondary':'#94a3b8',
      '--text-muted':    '#475569',
      '--accent':        '#0e7490',
      '--accent-hover':  '#0891b2',
      '--accent-light':  '#22d3ee',
      '--success':       '#10b981',
      '--warning':       '#fbbf24',
      '--danger':        '#ef4444',
      '--sidebar-bg':    '#1a1f2e',
      '--sidebar-active':'#0e749018',
      '--sidebar-border':'#0e7490',
      '--card-bg':       '#1a1f2e',
      '--input-bg':      '#0f1117',
      '--modal-bg':      '#1a1f2e',
    }
  },

  midnight_blue: {
    id: 'midnight_blue',
    name: 'Midnight Blue',
    beschreibung: 'Dunkel · Satte Blautöne · Professionell',
    vorschau: ['#0a0f1e', '#111827', '#2563eb', '#60a5fa'],
    vars: {
      '--bg-primary':    '#0a0f1e',
      '--bg-secondary':  '#111827',
      '--bg-tertiary':   '#0d1323',
      '--border':        '#1e3a5f',
      '--border-hover':  '#2563eb',
      '--text-primary':  '#f0f4ff',
      '--text-secondary':'#93c5fd',
      '--text-muted':    '#4b6cb7',
      '--accent':        '#2563eb',
      '--accent-hover':  '#3b82f6',
      '--accent-light':  '#60a5fa',
      '--success':       '#34d399',
      '--warning':       '#fbbf24',
      '--danger':        '#f87171',
      '--sidebar-bg':    '#0d1323',
      '--sidebar-active':'#2563eb18',
      '--sidebar-border':'#2563eb',
      '--card-bg':       '#111827',
      '--input-bg':      '#0a0f1e',
      '--modal-bg':      '#111827',
    }
  },

  forest_green: {
    id: 'forest_green',
    name: 'Forest Green',
    beschreibung: 'Dunkel · Grün · Natürlich · Ruhig',
    vorschau: ['#0a1410', '#0f1f18', '#059669', '#34d399'],
    vars: {
      '--bg-primary':    '#0a1410',
      '--bg-secondary':  '#0f1f18',
      '--bg-tertiary':   '#0c1a14',
      '--border':        '#1a3028',
      '--border-hover':  '#059669',
      '--text-primary':  '#ecfdf5',
      '--text-secondary':'#6ee7b7',
      '--text-muted':    '#2d6a4f',
      '--accent':        '#059669',
      '--accent-hover':  '#10b981',
      '--accent-light':  '#34d399',
      '--success':       '#34d399',
      '--warning':       '#fbbf24',
      '--danger':        '#f87171',
      '--sidebar-bg':    '#0c1a14',
      '--sidebar-active':'#05966918',
      '--sidebar-border':'#059669',
      '--card-bg':       '#0f1f18',
      '--input-bg':      '#0a1410',
      '--modal-bg':      '#0f1f18',
    }
  },

  solar_orange: {
    id: 'solar_orange',
    name: 'Solar Orange',
    beschreibung: 'Dunkel · Warme Töne · Energie',
    vorschau: ['#0f0a05', '#1c1008', '#d97706', '#fbbf24'],
    vars: {
      '--bg-primary':    '#0f0a05',
      '--bg-secondary':  '#1c1008',
      '--bg-tertiary':   '#150d06',
      '--border':        '#2d1a08',
      '--border-hover':  '#d97706',
      '--text-primary':  '#fef3c7',
      '--text-secondary':'#fcd34d',
      '--text-muted':    '#78350f',
      '--accent':        '#d97706',
      '--accent-hover':  '#f59e0b',
      '--accent-light':  '#fbbf24',
      '--success':       '#34d399',
      '--warning':       '#fbbf24',
      '--danger':        '#f87171',
      '--sidebar-bg':    '#150d06',
      '--sidebar-active':'#d9770618',
      '--sidebar-border':'#d97706',
      '--card-bg':       '#1c1008',
      '--input-bg':      '#0f0a05',
      '--modal-bg':      '#1c1008',
    }
  },

  clavissimo_green: {
    id: 'clavissimo_green',
    name: 'Clavissimo Light',
    beschreibung: 'Hell · Cannabis-Grün · Kompakt · B2B',
    vorschau: ['#F5F8F4', '#ffffff', '#16A34A', '#0F7C39'],
    vars: {
      '--bg-primary':    '#F5F8F4',
      '--bg-secondary':  '#FFFFFF',
      '--bg-tertiary':   '#ECF3EB',
      '--border':        '#DCE6DC',
      '--border-hover':  '#16A34A',
      '--text-primary':  '#17241A',
      '--text-secondary':'#3E4E40',
      '--text-muted':    '#748575',
      '--accent':        '#16A34A',
      '--accent-hover':  '#0F7C39',
      '--accent-light':  '#16A34A',
      '--success':       '#16A34A',
      '--warning':       '#B4650F',
      '--danger':        '#B3261E',
      '--sidebar-bg':    '#123A22',
      '--sidebar-active':'#16A34A22',
      '--sidebar-border':'#16A34A',
      '--card-bg':       '#FFFFFF',
      '--input-bg':      '#F5F8F4',
      '--modal-bg':      '#FFFFFF',
    }
  },

  arctic_light: {
    id: 'arctic_light',
    name: 'Arctic Light',
    beschreibung: 'Hell · Sauber · Modern · Büro',
    vorschau: ['#f8fafc', '#ffffff', '#0e7490', '#0891b2'],
    vars: {
      '--bg-primary':    '#f1f5f9',
      '--bg-secondary':  '#ffffff',
      '--bg-tertiary':   '#e2e8f0',
      '--border':        '#cbd5e1',
      '--border-hover':  '#94a3b8',
      '--text-primary':  '#0f172a',
      '--text-secondary':'#334155',
      '--text-muted':    '#64748b',
      '--accent':        '#0e7490',
      '--accent-hover':  '#0891b2',
      '--accent-light':  '#0e7490',
      '--success':       '#059669',
      '--warning':       '#d97706',
      '--danger':        '#dc2626',
      '--sidebar-bg':    '#ffffff',
      '--sidebar-active':'#0e749012',
      '--sidebar-border':'#0e7490',
      '--card-bg':       '#ffffff',
      '--input-bg':      '#f8fafc',
      '--modal-bg':      '#ffffff',
    }
  }
}

export function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES.clavissimo_green
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  localStorage.setItem('clavis_theme', themeId)
}

export function loadSavedTheme() {
  const saved = localStorage.getItem('clavis_theme') || 'clavissimo_green'
  applyTheme(saved)
  return saved
}

export function getTheme(id) {
  return THEMES[id] || THEMES.clavissimo_green
}
