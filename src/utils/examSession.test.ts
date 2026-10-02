import { describe, expect, it } from 'vitest';
import { answerIndex, calculate, fitTool, sessionSummary } from './examSession';

describe('session grading', () => {
  const questions = [
    { subject: 'Math', options: ['A', 'B'], correct: 0 },
    { subject: 'Math', options: ['A', 'B'], correct: 1 },
    { subject: 'Reading', options: ['A', 'B'], correct: null },
    { subject: 'Reading', options: ['A', 'B'], correct: 5 },
  ];
  it('does not award marks for skipped questions without answer keys', () => {
    expect(sessionSummary(questions, [0, 0, null, 1])).toEqual({ correct: 1, incorrect: 1, skipped: 1, ungraded: 1, graded: 2, answered: 3, percent: 50 });
  });
  it('handles an entirely ungraded paper without inventing a percentage', () => {
    expect(sessionSummary(questions.slice(2), [0, null]).percent).toBeNull();
    expect(answerIndex({ ...questions[0], correct: '1' })).toBe(1);
  });
});
describe('calculator', () => {
  it('respects arithmetic precedence, parentheses, percentages and degree functions', () => {
    expect(calculate('2+3×4')).toBe('14');
    expect(calculate('(2+3)^2')).toBe('25');
    expect(calculate('sqrt(81)+sin(30)')).toBe('9.5');
    expect(calculate('sin(30)^2')).toBe('0.25');
    expect(calculate('250×10%')).toBe('25');
    expect(calculate('-2^2')).toBe('-4');
    expect(calculate('2^-2')).toBe('0.25');
  });
  it('rejects executable content, incomplete expressions and nonfinite answers', () => {
    for (const expression of ['alert(1)', '1/0', '(2+3', '4+', 'sqrt(-1)']) expect(() => calculate(expression)).toThrow();
  });
});
describe('floating tools', () => {
  it('keeps a resized or moved calculator inside a narrow viewport', () => {
    const rect = fitTool({ x: 900, y: -100, width: 600, height: 900 }, { width: 320, height: 640 });
    expect(rect.x).toBeGreaterThanOrEqual(8); expect(rect.y).toBeGreaterThanOrEqual(8);
    expect(rect.x + rect.width).toBeLessThanOrEqual(312);
    expect(rect.y + rect.height).toBeLessThanOrEqual(632);
  });
});
