import { describe, expect, it } from 'vitest';
import { studyPlan, gradedPercent } from './studyPlan';
const material = (id: string) => ({ id, title: id, questions: [{ question: 'Saved question' }] });
const result = (id: string, bundle: string, score: number, at = '2026-10-16T12:00:00Z') => ({ id, source_bundle_id: bundle, score, total_questions: 10, completed_at: at, title: bundle });
describe('device study plan', () => {
  it('only recommends real question data available on the device', () => {
    expect(studyPlan([{ id: 'online-only', question_count: 100 }], []).material).toBeNull();
    expect(studyPlan([material('saved')], []).material.id).toBe('saved');
  });
  it('revisits a weak saved paper using its latest outcome, then suggests an untried paper', () => {
    const saved = [material('chemistry'), material('biology')];
    expect(studyPlan(saved, [result('one', 'chemistry', 4)]).material.id).toBe('chemistry');
    expect(studyPlan(saved, [result('one', 'chemistry', 4), result('two', 'chemistry', 9, '2026-10-17T12:00:00Z')]).material.id).toBe('biology');
  });
  it('does not interpret ungraded practice as a zero score', () => {
    expect(gradedPercent({ total_questions: 10, graded_total: 0, score: 0 })).toBeNull();
    expect(gradedPercent({ total_questions: 10, graded_total: 5, score: 4 })).toBe(80);
  });
});
