import { apiUrl } from './api';
import { supabase } from './supabase';

export type RecommendationCandidate = {
  questionKey: string;
  topicKey: string;
};

type CohortStat = { attempts: number; correct: number };

async function authenticatedApi(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Sign in is required for recommendations.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${data.session.access_token}`);
  return fetch(apiUrl(path), { ...init, headers });
}

/**
 * Ranks Hostinger question references without sending the question payload to
 * Supabase. Weak areas, evidence confidence, and anonymous cohort difficulty
 * are combined so the next item is useful rather than merely popular.
 */
export async function rankRecommendationCandidates<T extends RecommendationCandidate>(
  userId: string,
  candidates: T[]
): Promise<T[]> {
  if (candidates.length < 2) return candidates;
  const topicKeys = [...new Set(candidates.map((candidate) => candidate.topicKey))];
  const [{ data: mastery, error: masteryError }, statsResponse] = await Promise.all([
    supabase
      .from('student_topic_mastery')
      .select('topic_key, mastery_score, confidence_score')
      .eq('user_id', userId)
      .in('topic_key', topicKeys),
    authenticatedApi(`/api/recommendations/question-stats?keys=${encodeURIComponent(candidates.map((candidate) => candidate.questionKey).join(','))}`),
  ]);
  if (masteryError) throw masteryError;
  if (!statsResponse.ok) throw new Error('Could not load anonymous question statistics.');
  const { stats = {} } = await statsResponse.json() as { stats: Record<string, CohortStat> };
  const byTopic = new Map((mastery || []).map((row) => [row.topic_key, row]));

  return candidates
    .map((candidate, order) => {
      const topic = byTopic.get(candidate.topicKey);
      const weakness = 1 - Number(topic?.mastery_score ?? 0.5);
      const uncertainty = 1 - Number(topic?.confidence_score ?? 0.2);
      const cohort = stats[candidate.questionKey];
      const cohortDifficulty = cohort?.attempts >= 10 ? 1 - cohort.correct / cohort.attempts : 0.5;
      // Prioritise learning gaps; favour medium-to-hard cohort difficulty over
      // trivially easy or universally impossible items.
      const usefulDifficulty = 1 - Math.abs(cohortDifficulty - 0.6);
      return { candidate, order, score: weakness * 0.5 + uncertainty * 0.3 + usefulDifficulty * 0.2 };
    })
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ candidate }) => candidate);
}

/** Sends anonymous aggregate counts to Hostinger; it never includes a user id or question content. */
export async function recordAnonymousAttemptSummary(attempts: Array<{ questionKey: string; isCorrect: boolean | null }>) {
  const response = await authenticatedApi('/api/recommendations/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attempts }),
  });
  if (!response.ok) throw new Error('Could not record anonymous cohort summary.');
}
