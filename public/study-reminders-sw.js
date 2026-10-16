/* Push-only worker: never caches account responses or interferes with exam requests. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = {}; try { data = event.data?.json() || {}; } catch { /* A visible generic notification is still required. */ }
  let url = new URL('/?reminder=study', self.location.origin);
  try { const candidate = new URL(data.url || url, self.location.origin); if (candidate.origin === self.location.origin) url = candidate; } catch {}
  event.waitUntil(self.registration.showNotification(typeof data.title === 'string' ? data.title.slice(0, 100) : 'A study moment with Scholar', {
    body: typeof data.body === 'string' ? data.body.slice(0, 300) : 'Come back for a short practice session.',
    icon: '/pastq-icon-192.png', badge: '/pastq-icon-192.png', tag: typeof data.tag === 'string' ? data.tag.slice(0, 100) : 'pastq-study',
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
