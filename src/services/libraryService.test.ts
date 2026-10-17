import { beforeEach, describe, expect, it, vi } from 'vitest';
import localforage from 'localforage';
import { getOfflineBundle, getOfflineLibrary, saveBundle } from './libraryService';
import { UTME_BUNDLE_ID } from '../utils/utme';
vi.mock('localforage', () => ({ default: { config: vi.fn(), setItem: vi.fn(), getItem: vi.fn(), iterate: vi.fn() } }));
const items = new Map<string, any>();
beforeEach(() => {
  items.clear();
  vi.mocked(localforage.setItem).mockImplementation(async (key, value) => { items.set(key, value); return value; });
  vi.mocked(localforage.getItem).mockImplementation(async key => items.get(key) || null);
  vi.mocked(localforage.iterate).mockImplementation(async callback => { for (const [key, value] of items) callback(value, key, 0); return undefined as any; });
});
describe('private saved upload cache', () => {
  it('shows one complete UTME download and upgrades saved subject links without losing private material', async () => {
    await saveBundle({ id: 'utme2027-res-biology', title: 'Old Biology', questions: [{ subject: 'Biology' }] });
    await saveBundle({ id: UTME_BUNDLE_ID, title: 'UTME', kind: 'utme-bank', sourceAudit: { questions: 2 }, questions: [{ subject: 'Biology' }, { subject: 'Physics' }] });
    await saveBundle({ id: 'my-paper', sourceSessionId: 'my-paper', ownerId: 'student-a', questions: [] });
    expect((await getOfflineLibrary('student-a')).map(item => item.id).sort()).toEqual(['my-paper', UTME_BUNDLE_ID].sort());
    expect((await getOfflineBundle('utme2027-res-biology')).questions).toHaveLength(2);
    expect((await getOfflineLibrary('student-b')).map(item => item.id)).toEqual([UTME_BUNDLE_ID]);
  });
  it('keeps uploads scoped to the account while retaining public downloads', async () => {
    await saveBundle({ id: 'paper-a', title: 'My paper', sourceSessionId: 'paper-a', ownerId: 'student-a', approvedAt: 'saved', questions: [] });
    await saveBundle({ id: 'public-paper', title: 'Public paper', questions: [] });
    expect((await getOfflineLibrary('student-a')).map(item => item.id)).toHaveLength(2);
    expect((await getOfflineLibrary('student-b')).map(item => item.id)).toEqual(['public-paper']);
    expect(await getOfflineBundle('paper-a', 'student-b')).toBeNull();
    expect((await getOfflineBundle('paper-a', 'student-a')).title).toBe('My paper');
  });
});
