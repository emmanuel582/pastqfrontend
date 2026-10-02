import { describe, it, expect } from 'vitest';
import { customDurationSeconds, selectSessionQuestions } from './cbtFilters';

const questions = [
  { id: 1, subject: 'Chemistry', year: ' 2019 ', topic: 'Atoms', question: 'Q1', options: ['A', 'B'] },
  { id: 2, subject: 'Chemistry', year: '2018', topic: 'Atoms', question: 'Q2', options: ['A', 'B'] },
  { id: 3, subject: 'Chemistry', year: '2019', topic: 'Bonding', question: 'Q3', options: ['A', 'B'] },
  { id: 4, subject: 'Biology', year: '2019', topic: 'Atoms', question: 'Q4', options: ['A', 'B'] },
  { id: 5, subject: 'Chemistry', year: '2019', topic: 'Atoms', question: 'Essay', options: [] },
];

describe('session setup selections', () => {
  it('intersects subject, topic and year and excludes non-CBT questions', () => {
    expect(selectSessionQuestions(questions, { subjects: ['Chemistry'], topics: ['Atoms'], years: ['2019'] }).map(q => q.id)).toEqual([1]);
  });
  it('applies a topic alone or a year alone without restoring the full bundle', () => {
    expect(selectSessionQuestions(questions, { subjects: ['Chemistry'], topics: ['Atoms'], years: null }).map(q => q.id)).toEqual([1, 2]);
    expect(selectSessionQuestions(questions, { subjects: ['Chemistry'], topics: null, years: ['2019'] }).map(q => q.id)).toEqual([1, 3]);
  });
  it('clearing any selection returns no questions, while all is explicit', () => {
    expect(selectSessionQuestions(questions, { subjects: ['Chemistry'], topics: [], years: null })).toEqual([]);
    expect(selectSessionQuestions(questions, { subjects: ['Chemistry'], topics: null, years: [] })).toEqual([]);
    expect(selectSessionQuestions(questions, { subjects: [], topics: null, years: null })).toEqual([]);
    expect(selectSessionQuestions(questions, { subjects: ['Chemistry'], topics: null, years: null })).toHaveLength(3);
  });
  it('keeps a no-match combination empty instead of falling back to all questions', () => {
    expect(selectSessionQuestions(questions, { subjects: ['Chemistry'], topics: ['Bonding'], years: ['2018'] })).toEqual([]);
  });
});

describe('custom session time', () => {
  it('accepts times outside the old presets, including fractional minutes', () => {
    expect(customDurationSeconds('37')).toBe(2220);
    expect(customDurationSeconds('185')).toBe(11100);
    expect(customDurationSeconds('2.5')).toBe(150);
  });
  it('rejects blank, zero, negative and invalid times', () => {
    for (const value of ['', ' ', '0', '-5', 'NaN', 'Infinity', '1e300']) expect(customDurationSeconds(value)).toBeNull();
  });
});
