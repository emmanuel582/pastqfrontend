/* Push-only worker: never caches account responses or interferes with exam requests. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = {}; try { data = event.data?.json() || {}; } catch { /* A visible generic notification is still required. */ }
  let url = new URL('/?reminder=study', self.location.origin);
  try { const candidate = new URL(data.url || url, self.location.origin); if (candidate.origin === self.location.origin) url = candidate; } catch {}
  // Only first-party, known artwork can enter an OS notification. Never fetch
  // arbitrary payload image URLs or expose study history through third parties.
  const mood = ['welcome', 'focus', 'celebrate'].includes(data.mood) ? data.mood : 'welcome';
  let image = `/pets/scholar/reminders/${mood}-v1.jpg`;
  try {
    const candidate = new URL(data.image, self.location.origin);
    if ([self.location.origin, 'https://76.13.110.6.nip.io'].includes(candidate.origin) && /^\/api\/reminders\/images\/[a-f0-9-]{36}$/.test(candidate.pathname) && !candidate.search && !candidate.hash && !candidate.username && !candidate.password) image = candidate.href;
  } catch {}
  event.waitUntil(self.registration.showNotification(typeof data.title === 'string' ? data.title.slice(0, 100) : 'A study moment with Scholar', {
    body: typeof data.body === 'string' ? data.body.slice(0, 300) : 'Come back for a short practice session.',
    icon: `/pets/scholar/reminders/${mood}-icon-v1.png`, image, badge: '/pastq-icon-192.png', tag: typeof data.tag === 'string' ? data.tag.slice(0, 100) : 'pastq-study',
    data: { url: url.pathname + url.search }, renotify: false,
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    let url = new URL('/?reminder=study', self.location.origin);
    try { const candidate = new URL(event.notification.data?.url || url, self.location.origin); if (candidate.origin === self.location.origin) url = candidate; } catch {}
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find(item => new URL(item.url).origin === self.location.origin);
    if (client) { client.postMessage({ type: 'PASTQ_OPEN_STUDY', url: url.pathname + url.search }); await client.focus(); }
    else await self.clients.openWindow(url.href);
  })());
});
