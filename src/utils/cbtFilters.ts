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

const ENGLISH_ALIASES = ['use of english', 'english language', 'english'];

export function isEnglishSubject(subject: string): boolean {
  const s = subject.trim().toLowerCase();
  return ENGLISH_ALIASES.some((a) => s === a || s.includes('english'));
}

export function isJambStyleExam(examType?: string): boolean {
  if (!examType) return false;
  const t = examType.toLowerCase();
  if (t.includes('post-utme') || t.includes('post utme')) return false;
  return t.includes('jamb') || t.includes('utme');
}

/** Unique subjects present in a bundle, sorted with English first when JAMB-style. */
export function getAvailableSubjects(bundle: CbtBundle, examType?: string): string[] {
  const subjects = [
    ...new Set(
      (bundle.questions || [])
        .map((q) => q.subject?.trim())
        .filter(Boolean) as string[]
    ),
  ];

  const jamb = isJambStyleExam(examType || bundle.examType);
  subjects.sort((a, b) => {
    if (jamb) {
      if (isEnglishSubject(a) && !isEnglishSubject(b)) return -1;
      if (!isEnglishSubject(a) && isEnglishSubject(b)) return 1;
    }
    return a.localeCompare(b);
  });
  return subjects;
}

/** Question counts per subject — helps UI when only one subject exists. */
export function getQuestionCountBySubject(questions: CbtQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const q of questions || []) {
    const s = (q.subject || 'General').trim();
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

/** Smart default: all subjects if bundle is small/single-subject; JAMB keeps English + first optional. */
export function getDefaultSelectedSubjects(bundle: CbtBundle, examType?: string): string[] {
  const subjects = getAvailableSubjects(bundle, examType);
  if (!subjects.length) return [];

  if (subjects.length === 1) return [...subjects];

  const jamb = isJambStyleExam(examType || bundle.examType);
  const english = subjects.find(isEnglishSubject);

  if (jamb && english) {
    const others = subjects.filter((s) => s !== english);
    return others.length ? [english, others[0]] : [english];
  }

  return [...subjects];
}

/** All years in bundle, newest first. */
export function getAvailableYears(questions: CbtQuestion[]): string[] {
  const years = [
    ...new Set(
      questions
        .map((q) => String(q.year || '').trim())
        .filter((y) => y && y !== 'Unknown' && y !== 'null')
    ),
  ];
  years.sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
  return years;
}

/**
 * Filter questions: selected subjects AND global year set (years apply to ALL subjects).
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
    const yearSet = new Set(selectedYears.map(String));
    result = result.filter((q) => yearSet.has(String(q.year || '')));
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
