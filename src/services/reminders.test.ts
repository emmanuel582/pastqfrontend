// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { auth: { getSession } } }));
import { enableReminders, testReminder, getReminders, historyForReminders, syncStudyHistory, syncReminderDeviceOwner, reminderPortrait, type ReminderSnapshot } from './reminders';
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); getSession.mockResolvedValue({ data: { session: { access_token: 'token', user: { id: 'student-a' } } } }); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('account study reminders', () => {
  it('syncs bounded study summaries without question content or invalid results', () => {
    const now = new Date().toISOString();
    const result = historyForReminders([{ id: 'valid', completed_at: now, total_questions: 10, score: 7, subject: 'Physics', questions: ['private question wording'], duration_seconds: 600 }, { id: 'bad', completed_at: now, total_questions: 0, score: 1 }, { id: 'future', completed_at: '2099-01-01', total_questions: 5, score: 2 }]);
    expect(result).toHaveLength(1); expect(result[0]).toMatchObject({ id: 'valid', score: 7, total: 10, subject: 'Physics' }); expect(JSON.stringify(result)).not.toContain('private question');
  });
  it('does not apply an old account request to the new signed-in account', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(getReminders('student-b')).rejects.toThrow('account changed'); expect(fetch).not.toHaveBeenCalled();
  });
  it('retains only the account summary for retry after a network failure', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Offline')).mockResolvedValueOnce({ ok: true, json: async () => ({ accepted: true }) }); vi.stubGlobal('fetch', fetch);
    await expect(syncStudyHistory([{ id: 'offline-session', completed_at: new Date().toISOString(), score: 0, total_questions: 0, subject: 'Physics', duration_seconds: 600 }], 'student-a')).rejects.toThrow('connect');
    expect(localStorage.getItem('pastq-reminder-activity:student-a')).toContain('offline-session'); expect(localStorage.getItem('pastq-reminder-activity:student-b')).toBeNull();
    await syncStudyHistory([], 'student-a'); expect(fetch).toHaveBeenCalledTimes(2); expect(JSON.parse(fetch.mock.calls[1][1].body).sessions[0]).toMatchObject({ id: 'offline-session', durationSeconds: 600, total: 0 }); expect(localStorage.getItem('pastq-reminder-activity:student-a')).toBeNull();
  });
  it('requests notification permission only from enable and leaves the server unchanged if declined', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied'), fetch = vi.fn();
    vi.stubGlobal('isSecureContext', true); vi.stubGlobal('PushManager', class {}); vi.stubGlobal('Notification', { permission: 'default', requestPermission }); vi.stubGlobal('fetch', fetch);
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
    const snapshot = { ownerId: 'student-a', push: { configured: true, publicKey: 'public-key', devices: [] } } as unknown as ReminderSnapshot;
    const result = enableReminders(snapshot, { enabled: false } as ReminderSnapshot['settings']);
    expect(requestPermission).toHaveBeenCalledOnce(); await expect(result).rejects.toThrow('not allowed'); expect(fetch).not.toHaveBeenCalled();
  });
  it('unsubscribes the previous browser account when ownership changes', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true), getRegistration = vi.fn().mockResolvedValue({ pushManager: { getSubscription: async () => ({ unsubscribe }) } });
    Object.defineProperty(navigator, 'serviceWorker', { value: { getRegistration }, configurable: true });
    await syncReminderDeviceOwner('student-a'); expect(unsubscribe).not.toHaveBeenCalled();
    await syncReminderDeviceOwner('student-b'); expect(unsubscribe).toHaveBeenCalledOnce(); expect(localStorage.getItem('pastq-reminder-device-owner')).toBe('student-b');
  });
  it('waits for an existing worker update before sending the test notification', async () => {
    const events: string[] = [], update = vi.fn(async () => { events.push('updated'); });
    const registration = { active: {}, update, pushManager: { getSubscription: async () => ({ endpoint: 'https://fcm.googleapis.com/current' }) } };
    const register = vi.fn(async () => registration), fetch = vi.fn(async () => { events.push('sent'); return { ok: true, json: async () => ({ ownerId: 'student-a' }) }; });
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true }); vi.stubGlobal('fetch', fetch);
    await testReminder('student-a'); expect(events).toEqual(['updated', 'sent']);
    expect(register).toHaveBeenCalledWith('/study-reminders-sw.js', { scope: '/', updateViaCache: 'none' });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ endpoint: 'https://fcm.googleapis.com/current' });
  });
  it('uses only known first-party expression portraits in the in-app preview', () => {
    expect(reminderPortrait('focus')).toBe('/pets/scholar/reminders/focus-v1.jpg'); expect(reminderPortrait('https://tracking.example')).toBe('/pets/scholar/reminders/welcome-v1.jpg');
  });
});
