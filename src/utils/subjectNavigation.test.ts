import { describe, expect, it } from 'vitest';
import { subjectAnsweredCount, subjectQuestionGroups, subjectQuestionPosition } from './subjectNavigation';
describe('subject-local CBT navigation', () => {
  it('shows Computer Studies question 15 of 20 rather than global question 75 of 80', () => {
    const questions = [...Array.from({length:40},()=>({subject:'Agricultural Science'})),...Array.from({length:20},()=>({subject:'Chemistry'})),...Array.from({length:20},()=>({subject:'Computer Studies'}))];
    const indexes = subjectQuestionGroups(questions).get('Computer Studies')!;
    expect(indexes).toHaveLength(20); expect(subjectQuestionPosition(indexes,74)).toBe(15);
    expect(indexes[14]).toBe(74);
    const answers = Array(80).fill(0);answers[65]=null;
    expect(subjectAnsweredCount(indexes,answers)).toBe(19);
  });
  it('keeps answer mappings correct when personalised ordering interleaves subjects', () => {
    const groups = subjectQuestionGroups([{subject:'Math'},{subject:'Chemistry'},{subject:'Math'},{subject:'Chemistry'}]);
    expect(groups.get('Math')).toEqual([0,2]);
    expect(subjectQuestionPosition(groups.get('Chemistry')!,3)).toBe(2);
    expect(subjectAnsweredCount(groups.get('Math')!,[null,0,1,null])).toBe(1);
  });
});
