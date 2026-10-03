export type StudyTheme = 'system' | 'dark' | 'light';
export const THEME_STORAGE_KEY = 'pastq-theme';

export function readTheme(): StudyTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch { return 'system'; }
}

export function applyTheme(theme: StudyTheme) {
  const resolved = theme === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Keep the current session usable when storage is blocked. */ }
}

/** Keep System mode in sync while the app is open, without overwriting it. */
export function followTheme(theme: StudyTheme): () => void {
  applyTheme(theme);
  if (theme !== 'system' || !window.matchMedia) return () => {};
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => applyTheme('system');
  if (query.addEventListener) {
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }
  query.addListener(update);
  return () => query.removeListener(update);
}
