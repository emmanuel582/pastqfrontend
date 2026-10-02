export type StudyTheme = 'dark' | 'light';
export const THEME_STORAGE_KEY = 'pastq-theme';

export function readTheme(): StudyTheme {
  try { return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

export function applyTheme(theme: StudyTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Keep the current session usable when storage is blocked. */ }
}
