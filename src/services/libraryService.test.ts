import { beforeEach, describe, expect, it, vi } from 'vitest';
import localforage from 'localforage';
import { getOfflineBundle, getOfflineLibrary, saveBundle } from './libraryService';
vi.mock('localforage', () => ({ default: { config: vi.fn(), setItem: vi.fn(), getItem: vi.fn(), iterate: vi.fn() } }));
const items = new Map<string, any>();
beforeEach(() => {
  items.clear();
  vi.mocked(localforage.setItem).mockImplementation(async (key, value) => { items.set(key, value); return value; });
  vi.mocked(localforage.getItem).mockImplementation(async key => items.get(key) || null);
  vi.mocked(localforage.iterate).mockImplementation(async callback => { for (const [key, value] of items) callback(value, key, 0); return undefined as any; });
});
describe('private saved upload cache', () => {
  it('keeps uploads scoped to the account while retaining public downloads', async () => {
    await saveBundle({ id: 'paper-a', title: 'My paper', sourceSessionId: 'paper-a', ownerId: 'student-a', approvedAt: 'saved', questions: [] });
    await saveBundle({ id: 'public-paper', title: 'Public paper', questions: [] });
    expect((await getOfflineLibrary('student-a')).map(item => item.id)).toHaveLength(2);
    expect((await getOfflineLibrary('student-b')).map(item => item.id)).toEqual(['public-paper']);
    expect(await getOfflineBundle('paper-a', 'student-b')).toBeNull();
    expect((await getOfflineBundle('paper-a', 'student-a')).title).toBe('My paper');
  });
});
