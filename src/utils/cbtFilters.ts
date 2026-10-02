export interface CbtQuestion {
  id?: number | string;
  subject: string;
  question: string;
  options: string[];
  correct?: number | string | null;
  year?: string | null;
  paper?: string | null;
  questionNumber?: number | null;
  [key: string]: unknown;
}

export interface CbtBundle {
  questions?: CbtQuestion[];
  examType?: string;
  university?: string;
  manufacturer?: string;
}

/** Unique subjects present in a bundle, alphabetically sorted. */
export function getAvailableSubjects(bundle: CbtBundle): string[] {
  const subjects = [
    ...new Set(
      (bundle.questions || [])
        .map((q) => q.subject?.trim())
        .filter(Boolean) as string[]
    ),
  ];
  subjects.sort((a, b) => a.localeCompare(b));
  return subjects;
}

/** Question counts per subject. */
export function getQuestionCountBySubject(questions: CbtQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const q of questions || []) {
    const s = (q.subject || 'General').trim();
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

/** Question counts per year (optionally limited to selected subjects). */
export function getQuestionCountByYear(
  questions: CbtQuestion[],
  selectedSubjects?: string[]
): Record<string, number> {
  let pool = questions || [];
  if (selectedSubjects?.length) {
    const subjectSet = new Set(selectedSubjects.map((s) => s.toLowerCase()));
    pool = pool.filter((q) => subjectSet.has((q.subject || '').trim().toLowerCase()));
  }
  const counts: Record<string, number> = {};
  for (const q of pool) {
    const y = String(q.year || '').trim();
    if (!y || y === 'Unknown' || y === 'null') continue;
    counts[y] = (counts[y] || 0) + 1;
  }
  return counts;
}

/** Default: all subjects in the bundle. */
export function getDefaultSelectedSubjects(bundle: CbtBundle): string[] {
  return getAvailableSubjects(bundle);
}

/** Years for selected subjects only, newest first. */
export function getAvailableYears(
  questions: CbtQuestion[],
  selectedSubjects?: string[]
): string[] {
  let pool = questions || [];
  if (selectedSubjects?.length) {
    const subjectSet = new Set(selectedSubjects.map((s) => s.toLowerCase()));
    pool = pool.filter((q) => subjectSet.has((q.subject || '').trim().toLowerCase()));
  }
  const years = [
    ...new Set(
      pool
        .map((q) => String(q.year || '').trim())
        .filter((y) => y && y !== 'Unknown' && y !== 'null')
    ),
  ];
  years.sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
  return years;
}

/**
 * Filter questions: selected subjects AND global year set (years apply to ALL selected subjects).
 */
export function filterCbtQuestions(
  questions: CbtQuestion[],
  selectedSubjects: string[],
  selectedYears: string[]
): CbtQuestion[] {
  if (!questions?.length) return [];

  let result = questions;

  if (selectedSubjects.length > 0) {
    const subjectSet = new Set(selectedSubjects.map((s) => s.toLowerCase()));
    result = result.filter((q) => subjectSet.has((q.subject || '').trim().toLowerCase()));
  }

  if (selectedYears.length > 0) {
    const yearSet = new Set(selectedYears.map(year => String(year).trim()));
    result = result.filter((q) => yearSet.has(String(q.year || '').trim()));
  }

  return result;
}

export function yearRangeLabel(years: string[]): string {
  if (!years.length) return 'All Years';
  if (years.length === 1) return years[0];
  const nums = years.map((y) => parseInt(y, 10)).filter((n) => !Number.isNaN(n));
  if (nums.length === years.length) {
    return `${Math.min(...nums)}–${Math.max(...nums)}`;
  }
  return `${years.length} years`;
}

/** Topic label of a question: explicit topic, else the document section it came from. */
export function topicOf(q: CbtQuestion): string | null {
  const t = String((q.topic as string) || (q.section as string) || '').trim();
  return t || null;
}

function inSubjects(pool: CbtQuestion[], selectedSubjects?: string[]): CbtQuestion[] {
  if (!selectedSubjects?.length) return pool;
  const subjectSet = new Set(selectedSubjects.map((s) => s.toLowerCase()));
  return pool.filter((q) => subjectSet.has((q.subject || '').trim().toLowerCase()));
}

/** Topics for the selected subjects, in the order the source document presents them. */
export function getAvailableTopics(questions: CbtQuestion[], selectedSubjects?: string[]): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const q of inSubjects(questions || [], selectedSubjects)) {
    const t = topicOf(q);
    if (t && !seen.has(t)) {
      seen.add(t);
      topics.push(t);
    }
  }
  return topics;
}

export function getQuestionCountByTopic(questions: CbtQuestion[], selectedSubjects?: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const q of inSubjects(questions || [], selectedSubjects)) {
    const t = topicOf(q);
    if (t) counts[t] = (counts[t] || 0) + 1;
  }
  return counts;
}

/** Narrow to selected topics (empty selection = all topics). */
export function filterByTopics(questions: CbtQuestion[], selectedTopics: string[]): CbtQuestion[] {
  if (!selectedTopics.length) return questions;
  const set = new Set(selectedTopics);
  return questions.filter((q) => {
    const t = topicOf(q);
    return t != null && set.has(t);
  });
}

/**
 * Questions the timed CBT runner can present and mark: those with at least two
 * options. Essay, short-answer, fill-in and structured questions are kept in
 * the material but are studied outside the CBT.
 */
export function isCbtQuestion(q: { options?: unknown }): boolean {
  return Array.isArray(q.options) && q.options.length >= 2;
}

/** Null means all; an empty selection means none, including when starting a session. */
export function selectSessionQuestions(questions: CbtQuestion[], selection: {
  subjects: string[]; years: string[] | null; topics: string[] | null;
}): CbtQuestion[] {
  if (!selection.subjects.length || selection.years?.length === 0 || selection.topics?.length === 0) return [];
  return filterByTopics(filterCbtQuestions(questions, selection.subjects, selection.years || []),
    selection.topics || []).filter(isCbtQuestion);
}

export function customDurationSeconds(minutes: string): number | null {
  if (!minutes.trim()) return null;
  const value = Number(minutes);
  const seconds = Math.round(value * 60);
  return Number.isFinite(value) && value > 0 && Number.isSafeInteger(seconds) && seconds > 0 ? seconds : null;
}
