import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ stores: new Map<string, Map<string, any>>(), failStore: '' }));
vi.mock('localforage', () => ({ default: { createInstance: ({ storeName }: { storeName: string }) => {
  const store = () => { if (!state.stores.has(storeName)) state.stores.set(storeName, new Map()); return state.stores.get(storeName)!; };
  return {
    getItem: async (key: string) => structuredClone(store().get(key) ?? null),
    setItem: async (key: string, value: any) => { if (state.failStore === storeName) throw new Error('Quota exceeded'); store().set(key, structuredClone(value)); return value; },
    removeItem: async (key: string) => { store().delete(key); },
    iterate: async (callback: any) => { for (const [key, value] of store()) callback(structuredClone(value), key); },
  };
} } }));
import { createAttempt, readAttempt, listAttempts, saveCheckpoint, completeAttempt, claimAttempt, discardAttempt, listBookmarks, saveBookmark, removeBookmark, bookmarkKey, attemptSummary } from './practiceArchive';
const sha = 'a'.repeat(64), unused = 'b'.repeat(64);
const input = () => ({ title: 'UTME Biology', source: { bundleId: 'utme', version: 'v1' }, duration: 120, practice: false,
  questions: [
    { id: 1, practiceKey: 'biology:2020:1', subject: 'Biology', year: '2020', question: 'Identify this cell.', questionHtml: `<img src="pastq-asset:${sha}">`, options: ['Plant', 'Animal'], optionsHtml: ['Plant', 'Animal'], correct: 0, explanation: 'Cell wall.', figures: [{url:'data:image/png;base64,AQ=='}] },
    { id: 2, subject: 'Biology', question: 'Explain.', options: [], correct: null, explanation: '', type: 'theory', answerHtml: `<img src="pastq-asset:${sha}">` },
  ], assets: { [sha]: { mime: 'image/png', data: 'AQ==' }, [unused]: { mime: 'image/png', data: 'Ag==' } },
});
const progress = { answers: [0, 0], writtenAnswers: ['', 'My response'], flagged: [true, false], currentQ: 1 };
beforeEach(() => { state.stores.clear(); state.failStore = ''; vi.useRealTimers(); });
describe('durable private practice on this device', () => {
  it('restores exact questions, diagrams, answers, flags and position without copying the whole bank', async () => {
    const source = input(), attempt = await createAttempt('ada', source);
    source.questions[0].question = 'Edited after starting';
    await saveCheckpoint('ada', attempt.id, attempt.writer, progress);
    const saved = await readAttempt('ada', attempt.id);
    expect(saved.paper.questions[0].question).toBe('Identify this cell.');
    expect(saved.paper.questions[0].figures).toEqual([{url:'data:image/png;base64,AQ=='}]);
    expect(Object.keys(saved.paper.assets)).toEqual([sha]);
    expect(saved.attempt).toMatchObject(progress);
    expect(saved.attempt.deadline).toBe(attempt.deadline);
  });
  it('isolates accounts and refuses unauthenticated saves', async () => {
    const attempt = await createAttempt('ada', input());
    expect(await listAttempts('ben')).toEqual([]);
    await expect(readAttempt('ben', attempt.id)).rejects.toThrow('unavailable');
    await discardAttempt('ben', attempt.id);
    expect(await listAttempts('ada')).toHaveLength(1);
    expect(() => createAttempt('', input())).toThrow('Sign in');
  });
  it('uses one fixed wall-clock deadline across reloads and counts time spent away', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    const attempt = await createAttempt('ada', input());
    vi.advanceTimersByTime(125_000);
    const restored = await claimAttempt('ada', attempt.id);
    expect(restored.attempt.deadline).toBe(attempt.deadline);
    expect(restored.attempt.deadline).toBeLessThan(Date.now());
    const result = await completeAttempt('ada', attempt.id, attempt.writer, progress);
    expect(result.timeTaken).toBe(120);
  });
  it('is idempotent at completion and cannot be reverted by queued autosaves or discard', async () => {
    const attempt = await createAttempt('ada', input());
    const first = await completeAttempt('ada', attempt.id, attempt.writer, progress);
    const second = await completeAttempt('ada', attempt.id, attempt.writer, { ...progress, answers:[1,null] });
    await saveCheckpoint('ada', attempt.id, attempt.writer, { ...progress, answers:[1,null] });
    await discardAttempt('ada', attempt.id);
    expect(second).toEqual(first);
    expect((await readAttempt('ada',attempt.id)).attempt).toEqual(first);
    expect(first.score).toBe(1); expect(first.gradedTotal).toBe(1);
    expect(attemptSummary(first)).toMatchObject({ id: attempt.id, score:1, total_questions:2, graded_total:1 });
  });
  it('keeps multiple unfinished sessions instead of silently replacing their answers', async () => {
    const first = await createAttempt('ada', input()), second = await createAttempt('ada', input());
    await saveCheckpoint('ada', first.id, first.writer, progress);
    expect(await listAttempts('ada')).toHaveLength(2);
    await discardAttempt('ada',second.id);
    expect((await readAttempt('ada',first.id)).attempt.answers).toEqual([0,0]);
  });
  it('reports a session removed in another tab instead of silently claiming to save it', async () => {
    const attempt = await createAttempt('ada', input());
    await discardAttempt('ada', attempt.id);
    await expect(saveCheckpoint('ada', attempt.id, attempt.writer, progress)).rejects.toThrow('unavailable');
    expect(await listAttempts('ada')).toEqual([]);
  });
  it('rejects stale writers after another tab claims the session', async () => {
    const attempt = await createAttempt('ada', input());
    const stored = state.stores.get('practice_attempts')!.get('ada:'+attempt.id);
    stored.writer = 'another-tab';
    await expect(saveCheckpoint('ada',attempt.id,attempt.writer,progress)).rejects.toThrow('another tab');
    await expect(completeAttempt('ada',attempt.id,attempt.writer,progress)).rejects.toThrow('another tab');
    const claimed = await claimAttempt('ada',attempt.id);
    await saveCheckpoint('ada',attempt.id,claimed.attempt.writer,progress);
    expect((await readAttempt('ada',attempt.id)).attempt.answers).toEqual([0,0]);
  });
  it('does not claim success on storage failure and can retry finalizing without losing the checkpoint', async () => {
    state.failStore='practice_attempts';
    await expect(createAttempt('ada',input())).rejects.toThrow('Quota');
    expect(state.stores.get('practice_papers')?.size).toBe(0);
    state.failStore=''; const attempt = await createAttempt('ada',input());
    await saveCheckpoint('ada',attempt.id,attempt.writer,progress);
    state.failStore='practice_attempts';
    await expect(completeAttempt('ada',attempt.id,attempt.writer,progress)).rejects.toThrow('Quota');
    state.failStore=''; expect((await readAttempt('ada',attempt.id)).attempt.status).toBe('active');
    expect((await completeAttempt('ada',attempt.id,attempt.writer,progress)).status).toBe('completed');
  });
  it('rejects corrupt attempts instead of opening mismatched papers', async () => {
    const attempt=await createAttempt('ada',input());
    state.stores.get('practice_papers')!.get('ada:'+attempt.id).questions.pop();
    await expect(readAttempt('ada',attempt.id)).rejects.toThrow('saved questions');
    state.stores.get('practice_attempts')!.get('ada:'+attempt.id).writtenAnswers=null;
    expect(await listAttempts('ada')).toEqual([]);
  });
  it('persists deduplicated bookmarks with source diagrams and keeps account ownership', async () => {
    const paper=input(), question=paper.questions[0];
    const row=await saveBookmark('ada',{ title:paper.title, source:paper.source, question, assets:paper.assets, answer:1 });
    question.id=88;
    expect(await bookmarkKey(paper.source,question)).toBe(row.key);
    await saveBookmark('ada',{ title:paper.title, source:paper.source, question, assets:paper.assets, answer:0 });
    expect(await listBookmarks('ada')).toHaveLength(1);
    expect(await listBookmarks('ben')).toEqual([]);
    expect(Object.keys((await listBookmarks('ada'))[0].assets)).toEqual([sha]);
    await removeBookmark('ben',row.key); expect(await listBookmarks('ada')).toHaveLength(1);
    await removeBookmark('ada',row.key); expect(await listBookmarks('ada')).toEqual([]);
  });
});
