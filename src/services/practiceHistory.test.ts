import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ values: new Map(), owner: 'student-a', upsert: vi.fn() }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({ getItem: async (key: string) => structuredClone(state.values.get(key)), setItem: async (key: string, value: unknown) => state.values.set(key, structuredClone(value)) }) } }));
vi.mock('./supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: state.owner } } } }) }, from: () => ({ upsert: state.upsert }) } }));
import { rememberPractice, readPracticeHistory, cachePracticeHistory, syncPracticeHistory } from './practiceHistory';
const summary = { id: 'result-1', title: 'Chemistry', completed_at: '2026-10-17T12:00:00.000Z', score: 4, total_questions: 10, graded_total: 5, source_bundle_id: 'paper-1', pending: true };
beforeEach(() => { state.values.clear(); state.owner = 'student-a'; state.upsert.mockReset().mockResolvedValue({ error: null }); });
describe('offline outcome history', () => {
  it('persists outcomes by account and keeps them when online history is empty', async () => {
    await rememberPractice('student-a', summary);
    expect(await readPracticeHistory('student-b')).toEqual([]);
    expect(await cachePracticeHistory('student-a', [])).toEqual([summary]);
    expect(await cachePracticeHistory('student-a', [{ ...summary, graded_total: undefined }])).toHaveLength(1);
    expect((await readPracticeHistory('student-a'))[0].graded_total).toBe(5);
  });
  it('keeps failed syncs queued and retries the same result ID without private question content', async () => {
    await rememberPractice('student-a', summary); state.upsert.mockResolvedValueOnce({ error: new Error('offline') });
    await expect(syncPracticeHistory('student-a')).rejects.toThrow('offline');
    expect((await readPracticeHistory('student-a'))[0].pending).toBe(true);
    await syncPracticeHistory('student-a');
    expect(state.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'result-1', user_id: 'student-a' }), { onConflict: 'id' });
    const row = state.upsert.mock.calls[1][0]; expect(row).not.toHaveProperty('graded_total'); expect(row).not.toHaveProperty('pending'); expect(row).not.toHaveProperty('questions'); expect(row).not.toHaveProperty('completed_at'); expect(row.created_at).toBe(summary.completed_at);
    expect((await readPracticeHistory('student-a'))[0].pending).toBe(false);
  });
  it('does not upload a previous account’s pending outcomes after switching accounts', async () => {
    await rememberPractice('student-a', summary); state.owner = 'student-b'; await syncPracticeHistory('student-a'); expect(state.upsert).not.toHaveBeenCalled();
  });
  it('coalesces reconnect events into one upload for the same account', async () => {
    await rememberPractice('student-a', summary);
    await Promise.all([syncPracticeHistory('student-a'), syncPracticeHistory('student-a'), syncPracticeHistory('student-a')]);
    expect(state.upsert).toHaveBeenCalledTimes(1);
  });
  it('loads existing created_at history and discards non-summary payloads', async () => {
    const rows = await cachePracticeHistory('student-a', [{ id: 'legacy', title: 'Maths', created_at: '2026-10-16T10:00:00Z', total_questions: 5, score: 3, questions: ['Private wording'], access_token: 'never-store-this' }]);
    expect(rows[0].completed_at).toBe('2026-10-16T10:00:00.000Z'); expect(rows[0]).not.toHaveProperty('questions'); expect(rows[0]).not.toHaveProperty('access_token');
  });
});
