import localforage from 'localforage';
import type { StudyQuestion } from '../app/components/cbt/StudyWorkspace';
import type { SourceAssets } from '../utils/sourceHtml';
import { answerIndex } from '../utils/examSession';
import type { PracticeSummary } from './practiceHistory';

export type SavedQuestion = StudyQuestion & { id?: number | string; practiceKey?: string; [key: string]: any };
export type PracticeSource = { bundleId: string; version: string | null };
export type PracticePaper = { title: string; source: PracticeSource; questions: SavedQuestion[]; assets: SourceAssets };
export type SavedAttempt = {
  id: string; owner: string; writer: string; title: string; source: PracticeSource;
  status: 'active' | 'completed'; startedAt: string; updatedAt: string; completedAt?: string;
  deadline: number; duration: number; practice: boolean; questionCount: number;
  answers: (number | null)[]; writtenAnswers: string[]; flagged: boolean[]; currentQ: number;
  score?: number; gradedTotal?: number; timeTaken?: number;
};
export type Checkpoint = Pick<SavedAttempt, 'answers' | 'writtenAnswers' | 'flagged' | 'currentQ'>;
export type SavedBookmark = { key: string; owner: string; title: string; source: PracticeSource; question: SavedQuestion; assets: SourceAssets; answer: number | null; createdAt: string };
const papers = localforage.createInstance({ name: 'PastQStudent', storeName: 'practice_papers' });
const attempts = localforage.createInstance({ name: 'PastQStudent', storeName: 'practice_attempts' });
const bookmarks = localforage.createInstance({ name: 'PastQStudent', storeName: 'question_bookmarks' });
const queues = new Map<string, Promise<unknown>>();
let writer: string;
const writerId = () => writer ||= crypto.randomUUID();
const prefix = (owner: string) => { if (!owner) throw new Error('Sign in to save your practice.'); return `${encodeURIComponent(owner)}:`; };
const key = (owner: string, id: string) => prefix(owner) + id;
function serial<T>(owner: string, task: () => Promise<T>): Promise<T> {
  prefix(owner);
  const work = async () => typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(`pastq-practice:${owner}`, task) : task();
  const next = (queues.get(owner) || Promise.resolve()).catch(() => {}).then(work);
  queues.set(owner, next); void next.finally(() => { if (queues.get(owner) === next) queues.delete(owner); }).catch(() => {});
  return next;
}
export async function flushPractice(owner: string) { await queues.get(owner); }

/** Copy just the question's raster assets, never the entire downloaded bank. */
export function questionAssets(questions: SavedQuestion[], assets: SourceAssets = {}): SourceAssets {
  const selected: SourceAssets = {};
  for (const question of questions) {
    const html = [question.questionHtml, ...(question.optionsHtml || []), question.answerHtml, question.explanationHtml, question.passage || ''].filter(Boolean).join(' ');
    for (const match of html.matchAll(/pastq-asset:([a-f0-9]{64})/g)) if (assets[match[1]]) selected[match[1]] = assets[match[1]];
  }
  return selected;
}
function checkpoint(patch: Checkpoint, count: number): Checkpoint {
  return {
    answers: Array.from({ length: count }, (_, i) => Number.isInteger(patch.answers[i]) && Number(patch.answers[i]) >= 0 ? patch.answers[i] : null),
    writtenAnswers: Array.from({ length: count }, (_, i) => typeof patch.writtenAnswers[i] === 'string' ? patch.writtenAnswers[i] : ''),
    flagged: Array.from({ length: count }, (_, i) => patch.flagged[i] === true),
    currentQ: Math.max(0, Math.min(count - 1, Number.isInteger(patch.currentQ) ? patch.currentQ : 0)),
  };
}
function validAttempt(value: any, owner: string): value is SavedAttempt {
  return value?.owner === owner && typeof value.id === 'string' && ['active', 'completed'].includes(value.status)
    && Number.isSafeInteger(value.questionCount) && value.questionCount > 0 && Array.isArray(value.answers)
    && Array.isArray(value.writtenAnswers) && Array.isArray(value.flagged)
    && typeof value.title === 'string' && typeof value.writer === 'string' && typeof value.source?.bundleId === 'string'
    && typeof value.updatedAt === 'string' && Number.isInteger(value.currentQ) && value.currentQ >= 0 && value.currentQ < value.questionCount
    && Number.isFinite(value.duration) && value.duration > 0 && Number.isFinite(value.deadline) && Number.isFinite(Date.parse(value.startedAt));
}
export function createAttempt(owner: string, input: PracticePaper & { duration: number; practice: boolean }): Promise<SavedAttempt> {
  return serial(owner, async () => {
    if (!input.questions.length || !Number.isFinite(input.duration) || input.duration <= 0) throw new Error('Choose questions and a valid time limit.');
    const id = crypto.randomUUID(), now = new Date().toISOString();
    const record: SavedAttempt = { id, owner, writer: writerId(), title: input.title || 'Practice session', source: { ...input.source }, status: 'active', startedAt: now, updatedAt: now,
      deadline: Date.now() + input.duration * 1000, duration: input.duration, practice: input.practice, questionCount: input.questions.length,
      ...checkpoint({ answers: [], writtenAnswers: [], flagged: [], currentQ: 0 }, input.questions.length) };
    const paper: PracticePaper = { title: record.title, source: record.source, questions: structuredClone(input.questions), assets: structuredClone(questionAssets(input.questions, input.assets)) };
    try { await papers.setItem(key(owner, id), paper); await attempts.setItem(key(owner, id), record); }
    catch (error) { await papers.removeItem(key(owner, id)).catch(() => {}); throw error; }
    return record;
  });
}
export async function listAttempts(owner: string): Promise<SavedAttempt[]> {
  const rows: SavedAttempt[] = []; const start = prefix(owner);
  await attempts.iterate((value, storedKey) => { if (storedKey.startsWith(start) && validAttempt(value, owner)) rows.push(value); });
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function readAttempt(owner: string, id: string) {
  const attempt = await attempts.getItem<SavedAttempt>(key(owner, id));
  if (!validAttempt(attempt, owner)) throw new Error('This saved session is unavailable on this device.');
  const paper = await papers.getItem<PracticePaper>(key(owner, id));
  if (!paper?.questions?.length || paper.questions.length !== attempt.questionCount) throw new Error('The saved questions could not load. Your downloaded library is still available.');
  return { attempt, paper };
}
export function claimAttempt(owner: string, id: string) {
  return serial(owner, async () => {
    const value = await readAttempt(owner, id);
    if (value.attempt.status === 'active') { value.attempt.writer = writerId(); await attempts.setItem(key(owner, id), value.attempt); }
    return value;
  });
}
export function saveCheckpoint(owner: string, id: string, expectedWriter: string, patch: Checkpoint) {
  // Clone before queuing: rapid clicks cannot mutate an older pending checkpoint.
  const copy = structuredClone(patch);
  return serial(owner, async () => {
    const stored = await attempts.getItem<SavedAttempt>(key(owner, id));
    if (!validAttempt(stored, owner)) throw new Error('This saved exam is unavailable. Open Past sessions to choose another exam.');
    if (stored.status !== 'active') return stored;
    if (stored.writer !== expectedWriter) throw new Error('This exam was resumed in another tab. Open Past sessions to resume it here.');
    const next = { ...stored, ...checkpoint(copy, stored.questionCount), updatedAt: new Date().toISOString() };
    await attempts.setItem(key(owner, id), next); return next;
  });
}
export function completeAttempt(owner: string, id: string, expectedWriter: string, patch: Checkpoint) {
  const copy = structuredClone(patch);
  return serial(owner, async () => {
    const { attempt, paper } = await readAttempt(owner, id);
    if (attempt.status === 'completed') return attempt;
    if (attempt.writer !== expectedWriter) throw new Error('This exam was resumed in another tab. Resume it here before submitting.');
    const progress = checkpoint(copy, attempt.questionCount), now = Date.now();
    const result: SavedAttempt = { ...attempt, ...progress, status: 'completed', updatedAt: new Date(now).toISOString(), completedAt: new Date(now).toISOString(),
      score: paper.questions.filter((q, i) => answerIndex(q) !== null && progress.answers[i] === answerIndex(q)).length,
      gradedTotal: paper.questions.filter(q => answerIndex(q) !== null).length,
      timeTaken: Math.min(attempt.duration, Math.max(0, Math.round((now - Date.parse(attempt.startedAt)) / 1000))) };
    await attempts.setItem(key(owner, id), result); return result;
  });
}
export function discardAttempt(owner: string, id: string) {
  return serial(owner, async () => {
    const value = await attempts.getItem<SavedAttempt>(key(owner, id));
    if (!validAttempt(value, owner) || value.status !== 'active') return;
    await attempts.removeItem(key(owner, id)); await papers.removeItem(key(owner, id));
  });
}
export function attemptSummary(attempt: SavedAttempt): PracticeSummary {
  return { id: attempt.id, title: attempt.title, completed_at: attempt.completedAt || attempt.updatedAt, score: attempt.score || 0, total_questions: attempt.questionCount,
    graded_total: attempt.gradedTotal || 0, source_bundle_id: attempt.source.bundleId, source_bundle_version: attempt.source.version,
    answered_count: attempt.answers.filter(answer => answer !== null).length, duration_seconds: attempt.timeTaken || 0 };
}
export async function bookmarkKey(source: PracticeSource, question: SavedQuestion) {
  const identity = JSON.stringify([source.bundleId, question.practiceKey || [question.subject, question.year, question.question, question.options]]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function listBookmarks(owner: string) {
  const rows: SavedBookmark[] = [], start = prefix(owner);
  await bookmarks.iterate((value: any, storedKey) => { if (storedKey.startsWith(start) && value?.owner === owner && value.question?.subject && value.question?.question) rows.push(value); });
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function saveBookmark(owner: string, input: Omit<SavedBookmark, 'key' | 'owner' | 'createdAt'>) {
  const copy = structuredClone(input);
  return serial(owner, async () => {
    const id = await bookmarkKey(copy.source, copy.question);
    const row: SavedBookmark = { ...copy, assets: questionAssets([copy.question], copy.assets), owner, key: id, createdAt: new Date().toISOString() };
    await bookmarks.setItem(key(owner, id), row); return row;
  });
}
export function removeBookmark(owner: string, id: string) { return serial(owner, async () => { await bookmarks.removeItem(key(owner, id)); }); }
