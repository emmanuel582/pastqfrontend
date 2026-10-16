import localforage from 'localforage';
import { supabase } from './supabase';

export type PracticeSummary = { id: string; title: string; score: number; total_questions: number; graded_total?: number; completed_at: string; source_bundle_id?: string; source_bundle_version?: string | null; answered_count?: number; duration_seconds?: number; pending?: boolean };
const storage = localforage.createInstance({ name: 'PastQStudent', storeName: 'practice_history' });
const queues = new Map<string, Promise<unknown>>();
const valid = (item: any): item is PracticeSummary => Boolean(item && typeof item.id === 'string' && Number.isFinite(Date.parse(item.completed_at)) && Number.isInteger(item.score) && Number.isInteger(item.total_questions) && item.total_questions >= 0 && item.score >= 0 && item.score <= item.total_questions);
export function mergePracticeHistory(remote: any[], local: PracticeSummary[]) {
  const items = new Map<string, PracticeSummary>();
  for (const raw of [...remote, ...local]) {
    const item = { ...raw, completed_at: raw?.completed_at || raw?.created_at };
    if (!valid(item)) continue;
    const clean: PracticeSummary = { id: item.id, title: typeof item.title === 'string' ? item.title.slice(0, 200) : 'Practice session', score: item.score, total_questions: item.total_questions, completed_at: new Date(item.completed_at).toISOString() };
    if (Number.isInteger(item.graded_total) && item.graded_total! >= item.score && item.graded_total! <= item.total_questions) clean.graded_total = item.graded_total;
    if (typeof item.source_bundle_id === 'string') clean.source_bundle_id = item.source_bundle_id;
    if (typeof item.source_bundle_version === 'string' || item.source_bundle_version === null) clean.source_bundle_version = item.source_bundle_version;
    for (const field of ['answered_count', 'duration_seconds'] as const) if (Number.isInteger(item[field]) && item[field]! >= 0) clean[field] = item[field];
    if (typeof item.pending === 'boolean') clean.pending = item.pending;
    items.set(item.id, { ...items.get(item.id), ...clean });
  }
  return [...items.values()].sort((a, b) => b.completed_at.localeCompare(a.completed_at)).slice(0, 200);
}
export async function readPracticeHistory(owner: string) { const items = await storage.getItem<PracticeSummary[]>(owner); return Array.isArray(items) ? mergePracticeHistory([], items) : []; }
function serialize<T>(owner: string, work: () => Promise<T>): Promise<T> {
  const next = (queues.get(owner) || Promise.resolve()).catch(() => {}).then(work);
  queues.set(owner, next); void next.finally(() => { if (queues.get(owner) === next) queues.delete(owner); }).catch(() => {});
  return next;
}
export function rememberPractice(owner: string, summary: PracticeSummary) {
  // Outcome summaries only; question text and answers stay with the saved paper.
  return serialize(owner, async () => { const items = mergePracticeHistory([], [summary, ...await readPracticeHistory(owner).then(items => items.filter(item => item.id !== summary.id))]); await storage.setItem(owner, items); return items; });
}
export function cachePracticeHistory(owner: string, remote: any[]) {
  return serialize(owner, async () => { const items = mergePracticeHistory(remote, await readPracticeHistory(owner)); await storage.setItem(owner, items); return items; });
}
const syncs = new Map<string, Promise<void>>();
export function syncPracticeHistory(owner: string) {
  const active = syncs.get(owner); if (active) return active;
  const task = uploadHistory(owner); syncs.set(owner, task);
  void task.finally(() => { if (syncs.get(owner) === task) syncs.delete(owner); }).catch(() => {});
  return task;
}
async function uploadHistory(owner: string) {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id !== owner) return;
  for (;;) {
    const pending = (await readPracticeHistory(owner)).filter(item => item.pending);
    if (!pending.length) return;
    for (const item of pending) {
    const current = await supabase.auth.getSession(); if (current.data.session?.user.id !== owner) return;
    const { pending: _pending, graded_total: _graded, completed_at, ...row } = item;
    const { error } = await supabase.from('exam_sessions').upsert({ ...row, created_at: completed_at, user_id: owner }, { onConflict: 'id' });
    if (error) throw error;
    await rememberPractice(owner, { ...item, pending: false });
    }
  }
}
