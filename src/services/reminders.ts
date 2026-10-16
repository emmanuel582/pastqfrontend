import { apiUrl } from './api';
import { supabase } from './supabase';
export type ReminderSettings = { enabled: boolean; mode: 'smart' | 'scheduled'; time: string; timezone: string; days: number[]; quietStart: string; quietEnd: string; personalized: boolean; pausedUntil: string | null };
export type ReminderSnapshot = { ownerId: string; activityCount?: number; settings: ReminderSettings; push: { configured: boolean; publicKey: string | null; devices: string[] }; preview: { title: string; body: string; targetTime: string; studiedToday: boolean; streak: number }; lastDelivery: { day: string; status: string } | null };
async function request<T>(path = '', method = 'GET', body?: unknown, ownerId?: string): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sign in again to manage study reminders.');
  if (ownerId && data.session.user.id !== ownerId) throw new Error('Your account changed. Reopen Preferences to continue.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(apiUrl(`/api/reminders${path}`), { method, signal: controller.signal, headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : result.error?.message || 'Could not save your reminders. Please try again.');
    return result;
  } catch (error) {
    if (error instanceof TypeError || error instanceof SyntaxError || (error instanceof Error && error.name === 'AbortError')) throw new Error('Couldn’t connect to study reminders. Please try again.');
    throw error;
  } finally { clearTimeout(timer); }
}
export const getReminders = (ownerId?: string) => request<ReminderSnapshot>('', 'GET', undefined, ownerId);
export const saveReminders = (settings: ReminderSettings, ownerId?: string) => request<ReminderSnapshot>('', 'PUT', settings, ownerId);
export function historyForReminders(sessions: any[]) {
  return sessions.flatMap(session => {
    const at = session.completed_at || session.created_at, timestamp = Date.parse(at);
    const total = Number(session.total_questions ?? session.total), score = Number(session.score);
    if (!session.id || !Number.isFinite(timestamp) || timestamp < Date.now() - 365 * 86400000 || timestamp > Date.now() + 300000 || !Number.isInteger(total) || total < 0 || !Number.isInteger(score) || score < 0 || score > total) return [];
    return [{ id: String(session.id), at: new Date(timestamp).toISOString(), total, score, durationSeconds: Number(session.duration_seconds) || 0, subject: String(session.subject || (session.title === 'CBT Session' ? '' : session.title) || '').slice(0, 100) }];
  }).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
}
export async function syncStudyHistory(sessions: any[], ownerId?: string) {
  const key = ownerId ? `pastq-reminder-activity:${ownerId}` : null;
  const read = () => { try { const value = key && JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const pending = historyForReminders(read().map(item => ({ ...item, completed_at: item.at, total_questions: item.total, duration_seconds: item.durationSeconds })));
  const merged = new Map([...historyForReminders(sessions), ...pending].map(item => [item.id, item]));
  const batch = [...merged.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
  if (!batch.length) return;
  try { if (key) localStorage.setItem(key, JSON.stringify(batch)); } catch { /* Still attempt the server save when device storage is full. */ }
  await request('/activity', 'POST', { sessions: batch }, ownerId);
  try {
    if (key) { const saved = new Set(batch.map(item => item.id)), remaining = read().filter(item => !saved.has(item.id)); if (remaining.length) localStorage.setItem(key, JSON.stringify(remaining)); else localStorage.removeItem(key); }
  } catch { /* A retry is idempotent if the device could not clear the queue. */ }
}
export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos';
export function notificationSupport(): string | null {
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'Study notifications need an updated browser with notification support.';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !window.matchMedia('(display-mode: standalone)').matches && !(navigator as Navigator & { standalone?: boolean }).standalone) return 'On iPhone, use Share → Add to Home Screen, then reopen PastQ to enable reminders.';
  if (Notification.permission === 'denied') return 'Notifications are blocked. Allow them in your browser settings, then try again.';
  return null;
}
let deviceTransition = Promise.resolve();
const DEVICE_OWNER = 'pastq-reminder-device-owner';
export function syncReminderDeviceOwner(owner: string | null) {
  deviceTransition = deviceTransition.catch(() => {}).then(async () => {
    let previous: string | null; try { previous = localStorage.getItem(DEVICE_OWNER); } catch { return; }
    if (previous && previous !== owner && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager?.getSubscription();
      await subscription?.unsubscribe();
    }
    try { if (owner) localStorage.setItem(DEVICE_OWNER, owner); else localStorage.removeItem(DEVICE_OWNER); } catch { /* Permission remains opt-in when storage is unavailable. */ }
  });
  return deviceTransition;
}
export async function currentDeviceId() {
  if (!('serviceWorker' in navigator)) return null;
  let subscription: PushSubscription | null | undefined;
  try { const registration = await navigator.serviceWorker.getRegistration('/'); subscription = await registration?.pushManager?.getSubscription(); } catch { return null; }
  if (!subscription) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subscription.endpoint));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
function keyBytes(key: string) { const base64 = key.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), character => character.charCodeAt(0)); }
export async function testReminder(ownerId: string) {
  const registration = await navigator.serviceWorker.getRegistration('/'), subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) throw new Error('Connect this device before testing reminders.');
  return request<ReminderSnapshot>('/test', 'POST', { endpoint: subscription.endpoint }, ownerId);
}
export async function enableReminders(snapshot: ReminderSnapshot, settings: ReminderSettings) {
  const unsupported = notificationSupport(); if (unsupported) throw new Error(unsupported);
  if (!snapshot.push.publicKey || !snapshot.push.configured) throw new Error('Study reminders are not available yet. Please try again later.');
  // Request immediately in the user's click handler, before network or worker awaits.
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not allowed on this device.');
  await deviceTransition;
  const registration = await navigator.serviceWorker.register('/study-reminders-sw.js', { scope: '/', updateViaCache: 'none' });
  if (!registration.active) await new Promise<void>((resolve, reject) => {
    const worker = registration.installing || registration.waiting;
    if (!worker) { reject(new Error('Could not prepare notifications. Please try again.')); return; }
    const timer = setTimeout(() => { worker.removeEventListener('statechange', change); reject(new Error('Notifications took too long to start. Please try again.')); }, 15000);
    const change = () => { if (worker.state === 'activated') { clearTimeout(timer); worker.removeEventListener('statechange', change); resolve(); } else if (worker.state === 'redundant') { clearTimeout(timer); worker.removeEventListener('statechange', change); reject(new Error('Could not prepare notifications. Please try again.')); } };
    worker.addEventListener('statechange', change); change();
  });
  let subscription = await registration.pushManager.getSubscription();
  const key = keyBytes(snapshot.push.publicKey);
  const oldKey = subscription?.options.applicationServerKey;
  if (subscription && oldKey && Array.from(new Uint8Array(oldKey)).join() !== Array.from(key).join()) { await subscription.unsubscribe(); subscription = null; }
  if (subscription) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subscription.endpoint));
    const id = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    if (!snapshot.push.devices.includes(id)) { await subscription.unsubscribe(); subscription = null; }
  }
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await request('/subscription', 'PUT', subscription.toJSON(), snapshot.ownerId);
  return saveReminders({ ...settings, enabled: true, pausedUntil: null }, snapshot.ownerId);
}
