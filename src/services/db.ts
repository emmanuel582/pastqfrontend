import { supabase } from "./supabase";

export const getUserProfile = async (uid: string) => {
  const { data, error } = await supabase.from("users").select("*").eq("id", uid).maybeSingle();
  if (error) throw error;
  return data;
};

export const createUserProfile = async (uid: string, email: string, name: string) => {
  const { data, error } = await supabase.from("users").insert({
    id: uid,
    email: email,
    full_name: name,
    onboarding_complete: false
  }).select().single();
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (uid: string, profileData: any) => {
  const { error } = await supabase.from("users").update(profileData).eq("id", uid);
  if (error) throw error;
};

export const saveExamSession = async (sessionData: any) => {
  const { data, error } = await supabase.from("exam_sessions").insert([sessionData]).select();
  if (error) throw error;
  return data[0].id;
};

export const getUserHistory = async (uid: string) => {
  const { data, error } = await supabase.from("exam_sessions").select("*").eq("user_id", uid);
  if (error) throw error;
  return data;
};

export type AttemptForStorage = {
  questionKey: string;
  topicKey: string;
  selectedOptionIndex: number | null;
  isCorrect: boolean | null;
  attemptOrder: number;
};

/**
 * Stores a student's outcome only. questionKey is an opaque Hostinger-library
 * reference; no question wording, choice, answer, image, or explanation is
 * ever sent to Supabase.
 */
export const savePracticeResult = async (input: {
  userId: string;
  sourceBundleId: string;
  sourceBundleVersion?: string | null;
  durationSeconds: number;
  score: number;
  attempts: AttemptForStorage[];
}) => {
  const completedAt = new Date().toISOString();
  const answeredCount = input.attempts.filter((attempt) => attempt.selectedOptionIndex != null).length;
  const { data: practice, error: practiceError } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: input.userId,
      source_bundle_id: input.sourceBundleId,
      source_bundle_version: input.sourceBundleVersion || null,
      mode: "timed",
      question_count: input.attempts.length,
      answered_count: answeredCount,
      correct_count: input.score,
      duration_seconds: input.durationSeconds,
      status: "completed",
      completed_at: completedAt,
      question_keys: input.attempts.map((attempt) => attempt.questionKey),
    })
    .select("id")
    .single();
  if (practiceError) throw practiceError;

  const { error: attemptsError } = await supabase.from("question_attempts").insert(
    input.attempts.map((attempt) => ({
      user_id: input.userId,
      practice_session_id: practice.id,
      question_key: attempt.questionKey,
      topic_keys: [attempt.topicKey],
      selected_option_index: attempt.selectedOptionIndex,
      is_correct: attempt.isCorrect,
      attempt_order: attempt.attemptOrder,
    }))
  );
  if (attemptsError) throw attemptsError;

  const topicDeltas = new Map<string, { attempts: number; correct: number }>();
  for (const attempt of input.attempts) {
    if (attempt.isCorrect == null) continue;
    const current = topicDeltas.get(attempt.topicKey) || { attempts: 0, correct: 0 };
    current.attempts += 1;
    current.correct += attempt.isCorrect ? 1 : 0;
    topicDeltas.set(attempt.topicKey, current);
  }
  const topicKeys = [...topicDeltas.keys()];
  if (topicKeys.length) {
    const { data: existing, error: existingError } = await supabase
      .from("student_topic_mastery")
      .select("topic_key, attempts, correct")
      .eq("user_id", input.userId)
      .in("topic_key", topicKeys);
    if (existingError) throw existingError;
    const previous = new Map((existing || []).map((row) => [row.topic_key, row]));
    const now = new Date().toISOString();
    const masteryRows = topicKeys.map((topicKey) => {
      const before = previous.get(topicKey) || { attempts: 0, correct: 0 };
      const delta = topicDeltas.get(topicKey)!;
      const attempts = before.attempts + delta.attempts;
      const correct = before.correct + delta.correct;
      return {
        user_id: input.userId,
        topic_key: topicKey,
        attempts,
        correct,
        mastery_score: attempts ? correct / attempts : 0,
        // Confidence rises with evidence but does not pretend a new learner is certain.
        confidence_score: Math.min(0.95, 0.2 + Math.log10(attempts + 1) / 2),
        last_attempt_at: now,
        updated_at: now,
      };
    });
    const { error: masteryError } = await supabase
      .from("student_topic_mastery")
      .upsert(masteryRows, { onConflict: "user_id,topic_key" });
    if (masteryError) throw masteryError;
  }

  await supabase.from("learning_events").insert({
    user_id: input.userId,
    event_name: "practice_completed",
    event_data: { practiceSessionId: practice.id, sourceBundleId: input.sourceBundleId, answeredCount },
  });

  return practice.id;
};
