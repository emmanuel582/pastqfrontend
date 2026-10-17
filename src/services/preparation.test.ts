// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { environmentFor, readPreparation, savePreparation, savedEnvironments } from './preparation';
beforeEach(() => localStorage.clear());
describe('downloaded preparation environments', () => {
  it('groups publishers under their actual school and exam, preserving simultaneous study spaces', () => {
    const material = (id: string, exam: string, school: string, publisher: string) => ({ id, examType: exam, university: school, publisher, questions: [{}] });
    const groups = savedEnvironments([material('a', 'Post UTME', 'UI', 'One'), material('b', 'Post UTME', 'UI', 'Two'), material('c', 'Post UTME', 'UNILAG', 'One'), material('d', 'WAEC', 'WAEC', 'Three'), { id: 'server-only', questions: [] }]);
    expect(groups).toHaveLength(3);
    expect(groups[0].materials.map(item => item.id)).toEqual(['a', 'b']);
    expect(groups[1].organization).toBe('UNILAG'); expect(groups[2].name).toBe('WAEC');
  });
  it('keeps an unclassified personal upload as its own space', () => {
    expect(environmentFor({ id: 'mine', title: 'Cell Biology', sourceSessionId: 'mine' })).toMatchObject({ id: 'material:mine', name: 'Cell Biology' });
  });
  it('persists focus offline per account and recovers from malformed storage', () => {
    savePreparation('a', { enabled: true, activeEnvironment: 'jamb:utme' });
    expect(readPreparation('a')).toEqual({ enabled: true, activeEnvironment: 'jamb:utme' });
    expect(readPreparation('b').enabled).toBe(false);
    localStorage.setItem('pastq-preparation:a', '{broken');
    expect(readPreparation('a')).toEqual({ enabled: false, activeEnvironment: null });
  });
});
