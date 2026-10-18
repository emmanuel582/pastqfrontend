import { describe, expect, it } from 'vitest';
import { examArtwork } from './examArtwork';

describe('exam identification artwork', () => {
  it('recognizes both WAEC collections and the original UTME bank', () => {
    expect(examArtwork('WAEC CBT')).toBe('waec');
    expect(examArtwork('WAEC Theory')).toBe('waec');
    expect(examArtwork({ id: 'utme-testdriller-2027' })).toBe('jamb');
    expect(examArtwork({ libraryMeta: { exam: { name: 'UTME' } } })).toBe('jamb');
  });
  it('respects the actual exam over a title or exam board', () => {
    expect(examArtwork({ title: 'UTME practice', exam: 'Post-UTME', organization: 'JAMB' })).toBeNull();
    expect(examArtwork({ title: 'WAEC revision', exam: 'NECO' })).toBeNull();
    expect(examArtwork('UI Post UTME')).toBeNull();
    expect(examArtwork({ title: 'My Biology notes' })).toBeNull();
    expect(examArtwork()).toBeNull();
  });
});
