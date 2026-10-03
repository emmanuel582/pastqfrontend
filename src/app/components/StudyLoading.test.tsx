import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StudyLoading from './StudyLoading';

describe('student loading screen', () => {
  it('uses Scholar and an indeterminate indicator before progress is known', () => {
    const html = renderToStaticMarkup(<StudyLoading />);
    expect(html).toContain('/pets/scholar/spritesheet.webp');
    expect(html).toContain('is-indeterminate');
    expect(html).not.toContain('aria-valuenow');
    expect(html).not.toContain('0%');
    expect(html).not.toMatch(/OCR|backend|Hostinger|metadata|Did you know|Hirose/);
  });
  it('shows real progress and clamps out-of-range values', () => {
    const html = renderToStaticMarkup(<StudyLoading name="Chemistry Remix" progress={42} />);
    expect(html).toContain('aria-valuenow="42"');
    expect(html).toContain('width:42%');
    expect(html).toContain('Chemistry Remix');
    expect(renderToStaticMarkup(<StudyLoading progress={120} />)).toContain('aria-valuenow="100"');
    expect(renderToStaticMarkup(<StudyLoading progress={-3} />)).toContain('aria-valuenow="0"');
  });
  it('shows actionable paused states without an animated progress indicator', () => {
    const html = renderToStaticMarkup(<StudyLoading state="waiting"><button>Add clearer photo</button></StudyLoading>);
    expect(html).toContain('Add clearer photo');
    expect(html).not.toContain('Cancel');
    expect(html).not.toContain('role="progressbar"');
  });
  it('celebrates completion without offering cancellation or showing empty action space', () => {
    const html = renderToStaticMarkup(<StudyLoading state="ready" progress={100}>{false}</StudyLoading>);
    expect(html).toContain('--scholar-row:3');
    expect(html).toContain('aria-valuenow="100"');
    expect(html).not.toContain('loading-cancel');
    expect(html).not.toContain('loading-actions');
  });
});
