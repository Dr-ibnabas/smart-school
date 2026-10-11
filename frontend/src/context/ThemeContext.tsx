import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * ThemeContext — thématise l'app selon l'école de l'utilisateur connecté.
 *
 * Le thème est stocké côté backend (table schools) et injecté en variables
 * CSS sur `:root`. Les composants utilisent `bg-primary`, `text-primary` etc.
 * comme avant — c'est le RESET des CSS vars qui change tout dynamiquement.
 */

export interface SchoolTheme {
  id?: number;
  code?: string;
  nom?: string;
  devise?: string | null;
  logo_url?: string | null;
  stamp_url?: string | null;
  theme_primary?: string;
  theme_primary_light?: string;
  theme_secondary?: string;
  theme_background?: string;
  theme_accent?: string;
  font_family?: string;
  density?: 'comfortable' | 'compact';
  /** 0 ou 1 selon le format de la DB. Activé = thème sombre global. */
  dark_mode?: 0 | 1 | boolean;
}

const DEFAULT_THEME: SchoolTheme = {
  theme_primary:       '#1e40af',
  theme_primary_light: '#3b82f6',
  theme_secondary:     '#0f172a',
  theme_background:    '#f8fafc',
  theme_accent:        '#10b981',
  font_family:         'Inter, system-ui, sans-serif',
  density:             'comfortable',
};

interface ThemeCtxValue {
  theme: SchoolTheme;
  setTheme: (t: Partial<SchoolTheme>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeCtxValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  resetTheme: () => {},
});

const applyToDom = (t: SchoolTheme) => {
  const html = document.documentElement;
  const root = html.style;
  if (t.theme_primary)       root.setProperty('--color-primary',         t.theme_primary);
  if (t.theme_primary_light) root.setProperty('--color-primary-light',   t.theme_primary_light);
  if (t.theme_secondary)     root.setProperty('--color-secondary',       t.theme_secondary);
  if (t.theme_background)    root.setProperty('--color-background',      t.theme_background);
  if (t.theme_accent)        root.setProperty('--color-success',         t.theme_accent);
  if (t.font_family)         root.setProperty('font-family',             t.font_family);

  document.body.dataset.density = t.density || 'comfortable';

  // Dark mode : on toggle la classe `dark` sur <html> + dataset (utile pour CSS sélecteurs)
  const isDark = t.dark_mode === 1 || t.dark_mode === true;
  html.classList.toggle('dark', isDark);
  html.dataset.theme = isDark ? 'dark' : 'light';
};

/**
 * Charge dynamiquement une police Google Fonts si elle n'est pas déjà chargée.
 * Détection : si family contient "Google:" comme préfixe (ex: "Google:Poppins").
 */
const loadGoogleFontIfNeeded = (fontFamily?: string) => {
  if (!fontFamily) return;
  const match = fontFamily.match(/^Google:([\w\s]+)/i);
  if (!match) return;
  const family = match[1].trim();
  const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hydrate depuis localStorage pour éviter le flash au reload
  const [theme, setThemeState] = useState<SchoolTheme>(() => {
    try {
      const raw = localStorage.getItem('smartschool_theme');
      if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
    } catch { /* noop */ }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    loadGoogleFontIfNeeded(theme.font_family);
    applyToDom(theme);
    try {
      localStorage.setItem('smartschool_theme', JSON.stringify(theme));
    } catch { /* noop */ }
  }, [theme]);

  const setTheme = useCallback((patch: Partial<SchoolTheme>) => {
    setThemeState(prev => ({ ...prev, ...patch }));
  }, []);

  const resetTheme = useCallback(() => {
    setThemeState(DEFAULT_THEME);
    try { localStorage.removeItem('smartschool_theme'); } catch { /* noop */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
