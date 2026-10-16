import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StudyHome from './StudyHome';
const props = { name: 'Ada Okafor', onOpen: vi.fn(), onLibrary: vi.fn(), onUpload: vi.fn() };
describe('personal Home', () => {
  it('welcomes a new student without a sample score or fake plan', () => {
    const html = renderToStaticMarkup(<StudyHome {...props} materials={[]} sessions={[]} />);
    expect(html).toContain('Hi, Ada.'); expect(html).toContain('Your first paper.'); expect(html).toContain('Find a paper'); expect(html).not.toContain('home-evidence'); expect(html).not.toContain('Last score');
  });
  it('offers a saved offline paper and shows only real study evidence', () => {
    const html = renderToStaticMarkup(<StudyHome {...props} materials={[{ id: 'paper', title: 'Chemistry revision', questions: [{}] }]} sessions={[{ id: 'result', source_bundle_id: 'paper', score: 3, total_questions: 5, completed_at: '2026-10-17T12:00:00Z', title: 'Chemistry' }]} />);
    expect(html).toContain('Worth another look'); expect(html).toContain('Last score 60%'); expect(html).toContain('Ready offline'); expect(html).not.toContain('Your first paper.');
  });
});
