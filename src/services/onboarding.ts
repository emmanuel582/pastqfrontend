import { supabase } from './supabase';

export type StudyFocus = { kind: 'school' | 'exam'; id: string; name: string; aliases?: string[] };
export type StudyPreferences = { undergraduate: boolean; focus: StudyFocus | null; completedAt: string };

export function readStudyPreferences(metadata: Record<string, any> = {}): StudyPreferences | null {
  const value = metadata?.study_preferences;
  if (!value || typeof value.undergraduate !== 'boolean' || typeof value.completedAt !== 'string') return null;
  const focus = value.focus;
  if (focus !== null && (!focus || !['school', 'exam'].includes(focus.kind) || typeof focus.id !== 'string' || typeof focus.name !== 'string' || !focus.name.trim())) return null;
  if (value.undergraduate && focus?.kind !== 'school') return null;
  return { undergraduate: value.undergraduate, focus: focus ? { kind: focus.kind, id: focus.id, name: focus.name, aliases: Array.isArray(focus.aliases) ? focus.aliases.filter((s: unknown) => typeof s === 'string') : [] } : null, completedAt: value.completedAt };
}

export async function completeOnboarding(undergraduate: boolean, focus: StudyFocus | null): Promise<StudyPreferences> {
  if (undergraduate && focus?.kind !== 'school') throw new Error('Please choose your university.');
  const preferences = { undergraduate, focus, completedAt: new Date().toISOString() };
  const { data, error } = await supabase.auth.updateUser({ data: { is_undergraduate: undergraduate, study_preferences: preferences } });
  if (error) throw error;
  if (!data.user) throw new Error('Please sign in again to save your choice.');
  // The authenticated account metadata is the canonical profile, so this works
  // without a schema migration. Keep the existing profile marker in sync too.
  const { error: profileError } = await supabase.from('users').update({ onboarding_complete: true }).eq('id', data.user.id);
  if (profileError) console.warn('Profile marker could not be updated; study preferences are saved on the account.');
  return preferences;
}
