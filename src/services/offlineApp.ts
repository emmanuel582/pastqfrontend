const OWNER_KEY = 'pastq-offline-owner-v1';
/** Only the last authenticated identity may reopen local work offline. No API credentials are copied. */
export function rememberOfflineOwner(user: any) {
  try {
    if (!user?.id) { localStorage.removeItem(OWNER_KEY); return; }
    const { full_name, avatar_url, study_preferences } = user.user_metadata || {};
    localStorage.setItem(OWNER_KEY, JSON.stringify({ id: user.id, email: user.email, user_metadata: { full_name, avatar_url, study_preferences } }));
  } catch { /* An unavailable device store must not prevent online sign-in. */ }
}
export function offlineOwner() {
  if (navigator.onLine) return null;
  try { const user = JSON.parse(localStorage.getItem(OWNER_KEY) || 'null'); return typeof user?.id === 'string' && user.id.length > 0 ? { ...user, offline: true } : null; } catch { return null; }
}
export async function registerOfflineApp() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try { await navigator.serviceWorker.register('/study-reminders-sw.js', { scope: '/', updateViaCache: 'none' }); }
  catch { /* Saved data remains intact. Storage settings show when shell caching is unavailable. */ }
}
