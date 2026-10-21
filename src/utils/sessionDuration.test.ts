import { describe, expect, it } from 'vitest';
import { durationFields, durationLabel, sessionDurationSeconds } from './sessionDuration';
describe('editable session time', () => {
  it('accepts custom hours and minutes with either field left blank', () => {
    expect(sessionDurationSeconds('1','35')).toBe(5700);
    expect(sessionDurationSeconds('','17')).toBe(1020);
    expect(sessionDurationSeconds('3','')).toBe(10800);
    expect(durationLabel(5700)).toBe('1h 35m');
    expect(durationLabel(7200)).toBe('2h');
  });
  it('rejects zero, negatives, fractions, invalid minute fields and unsafe durations', () => {
    for (const [hours,minutes] of [['',''],['0','0'],['-1','30'],['1.5','0'],['1','60'],['1','-3'],['Infinity','0'],['999999999999999999','0']]) expect(sessionDurationSeconds(hours,minutes)).toBeNull();
  });
  it('restores earlier minute-only drafts without shortening the time', () => {
    expect(durationFields('95')).toEqual({hours:'1',minutes:'35'});
    expect(durationFields('120')).toEqual({hours:'2',minutes:'0'});
    expect(durationFields('20.5')).toEqual({hours:'0',minutes:'21'});
    expect(durationFields('broken')).toEqual({hours:'0',minutes:'20'});
  });
});
