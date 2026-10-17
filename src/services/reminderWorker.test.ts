import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
const source = readFileSync(new URL('../../public/study-reminders-sw.js', import.meta.url), 'utf8');
function worker() { const listeners: Record<string, (event: any) => void> = {}, showNotification = vi.fn().mockResolvedValue(undefined), postMessage = vi.fn(), focus = vi.fn().mockResolvedValue(undefined), openWindow = vi.fn(); const self = { addEventListener: (name: string, listener: (event: any) => void) => { listeners[name] = listener; }, location: { origin: 'https://pastq.example.test' }, registration: { showNotification }, clients: { matchAll: async () => [{ url: 'https://pastq.example.test', postMessage, focus }], openWindow }, skipWaiting: vi.fn() }; runInNewContext(source, { self, URL }); return { listeners, showNotification, postMessage, focus, openWindow }; }
describe('study notification worker', () => {
  it('shows a visible branded notification and rejects external navigation targets', async () => {
    const w = worker(); let pending: Promise<unknown> = Promise.resolve(); w.listeners.push({ data: { json: () => ({ title: 'Scholar', body: 'A little Physics?', url: 'https://external.example/track' }) }, waitUntil: (value: Promise<unknown>) => { pending = value; } }); await pending;
    expect(w.showNotification).toHaveBeenCalledWith('Scholar', expect.objectContaining({ icon: '/pets/scholar/reminders/welcome-icon-v1.png', image: '/pets/scholar/reminders/welcome-v1.jpg', body: 'A little Physics?', data: { url: '/?reminder=study' } }));
  });
  it('opens an existing app through a message instead of reloading a live exam', async () => {
    const w = worker(); let pending: Promise<unknown> = Promise.resolve(); w.listeners.notificationclick({ notification: { close: vi.fn(), data: { url: '/?reminder=study&subject=Physics' } }, waitUntil: (value: Promise<unknown>) => { pending = value; } }); await pending;
    expect(w.postMessage).toHaveBeenCalledWith({ type: 'PASTQ_OPEN_STUDY', url: '/?reminder=study&subject=Physics' }); expect(w.focus).toHaveBeenCalledOnce(); expect(w.openWindow).not.toHaveBeenCalled();
  });
  it('uses the selected expression while ignoring untrusted remote artwork URLs', async () => {
    for (const mood of ['welcome', 'focus', 'celebrate', '../../external']) {
      const w = worker(); let pending: Promise<unknown> = Promise.resolve();
      w.listeners.push({ data: { json: () => ({ title: 'Scholar', mood, image: 'https://external.example/track.png', icon: 'https://external.example/icon.png' }) }, waitUntil: (value: Promise<unknown>) => { pending = value; } }); await pending;
      const expression = mood === '../../external' ? 'welcome' : mood;
      expect(w.showNotification).toHaveBeenCalledWith('Scholar', expect.objectContaining({ icon: `/pets/scholar/reminders/${expression}-icon-v1.png`, image: `/pets/scholar/reminders/${expression}-v1.jpg` }));
    }
  });
});
