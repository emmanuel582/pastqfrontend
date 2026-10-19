import { describe, expect, it } from 'vitest';
import { buildSubjectSession, defaultSubjectSettings, subjectPool, subjectQuestionCount, subjectYears } from './subjectSession';
import type { CbtQuestion } from './cbtFilters';
const question = (id: string, subject: string, year: string | null, extras = {}): CbtQuestion => ({ id, subject, year, question: id, options: ['A', 'B'], correct: 0, ...extras });

describe('independent subject setup', () => {
  it('keeps each subject’s year and question allocation independent, including when shuffled', () => {
    const math = [question('m25', 'Math', '2025'), question('m24a', 'Math', '2024'), question('m24b', 'Math', '2024')];
    const english = [question('e25a', 'English', '2025'), question('e25b', 'English', '2025'), question('e24', 'English', '2024')];
    const settings = { Math: { ...defaultSubjectSettings(math), year: '2024', count: '1' }, English: { ...defaultSubjectSettings(english), year: '2025', count: '2' } };
    const session = buildSubjectSession(['Math', 'English'], { Math: math, English: english }, settings, true);
    expect(session).toHaveLength(3);
    expect(session.filter(q => q.subject === 'Math')).toHaveLength(1);
    expect(session.find(q => q.subject === 'Math')?.year).toBe('2024');
    expect(session.filter(q => q.subject === 'English').map(q => q.id).sort()).toEqual(['e25a', 'e25b']);
  });
  it('chooses exactly one model paper in a year, without mixing different papers', () => {
    const pool = [question('base', 'Math', '2025', { sourceSet: '2025' }), question('model', 'Math', '2025', { sourceSet: '2025 Model I' }), question('older', 'Math', '2024', { sourceSet: '2024' })];
    const settings = defaultSubjectSettings(pool);
    expect(settings.year).toBe('2025'); expect(settings.paper).toBe('2025');
    expect(subjectPool(pool, settings).map(q => q.id)).toEqual(['base']);
    expect(subjectPool(pool, { ...settings, paper: '2025 Model I' }).map(q => q.id)).toEqual(['model']);
  });
  it('retains topic-only document sections and original written questions without fabricating a year', () => {
    const pool = [question('1', 'Biology', null, { section: 'Cells' }), question('2', 'Biology', null, { section: 'Tissues', type: 'short_answer', options: ['Source answer'], answerText: 'Source answer' })];
    const settings = defaultSubjectSettings(pool);
    expect(subjectYears(pool)).toEqual([]); expect(settings.studyBy).toBe('topic');
    expect(subjectPool(pool, { ...settings, topics: ['Tissues'] }).map(q => q.id)).toEqual(['2']);
    expect(subjectQuestionCount(pool, { ...settings, topics: [] })).toBe(0);
    expect(subjectPool(pool, settings)).toHaveLength(2);
  });
  it('does not silently replace an empty selection or an unavailable paper', () => {
    const pool = [question('1', 'Math', '2025')], settings = defaultSubjectSettings(pool);
    expect(subjectPool(pool, { ...settings, year: '2024' })).toEqual([]);
    expect(subjectQuestionCount(pool, { ...settings, count: '0' })).toBe(0);
    expect(buildSubjectSession([], { Math: pool }, { Math: settings }, false)).toEqual([]);
  });
  it('keeps every chosen revision question when a set mixes dated papers and topic notes',()=>{
    const pool=[question('paper','Biology','2020'),question('topic','Biology',null)];
    expect(subjectPool(pool,{...defaultSubjectSettings(pool),studyBy:'topic',selectedSet:true,count:'all'})).toHaveLength(2);
  });
});
