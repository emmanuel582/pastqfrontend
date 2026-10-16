import { apiUrl } from './api';
import { supabase } from './supabase';
export type StudySession = { id: string; title: string; kind: 'exam' | 'tutorial'; visibility: 'public' | 'private'; status: 'upcoming' | 'live' | 'ended'; logo: string | null; tag: string | null; startsAt: string | null; joined: boolean };
export type DiscoverData = { sessions: StudySession[]; joined: StudySession[] };
async function request<T>(owner: string, path = '', body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.id !== owner) throw new Error('Sign in again to join a session.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(apiUrl(`/api/discover${path}`), { signal: controller.signal, method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const value = await response.json();
    if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : value.error?.message || 'Could not load sessions. Please try again.');
    return value;
  } catch (error) { if (error instanceof TypeError || error instanceof SyntaxError || error instanceof Error && error.name === 'AbortError') throw new Error('Connect to the internet to find or join a session.'); throw error; }
  finally { clearTimeout(timer); }
}
export const getDiscover = (owner: string) => request<DiscoverData>(owner);
export const joinPublic = (owner: string, id: string) => request<{ session: StudySession }>(owner, `/${encodeURIComponent(id)}/join`, {});
export const joinPrivate = (owner: string, code: string) => request<{ session: StudySession }>(owner, '/join', { code });
