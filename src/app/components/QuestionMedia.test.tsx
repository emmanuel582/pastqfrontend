import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import QuestionMedia, { questionFigureSource } from './QuestionMedia';
describe('uploaded question diagrams', () => {
  it('retains embedded and absolute image sources without adding the API prefix', () => {
    const embedded = 'data:image/png;base64,iVBORw0KGgo=';
    expect(questionFigureSource(embedded)).toBe(embedded);
    expect(questionFigureSource('https://pastq.example/api/library/figures/id/a.png')).toBe('https://pastq.example/api/library/figures/id/a.png');
    const html = renderToStaticMarkup(<QuestionMedia figures={[{url:embedded}]} />);
    expect(html).toContain(`src="${embedded}"`); expect(html).toContain('loading="eager"');
  });
  it('rejects executable URLs and reports unavailable figures', () => {
    expect(questionFigureSource('javascript:alert(1)')).toBeNull();
    expect(questionFigureSource('data:image/svg+xml;base64,abc')).toBeNull();
    expect(renderToStaticMarkup(<QuestionMedia figures={[{url:'javascript:alert(1)'}]} />)).toContain('Image unavailable');
  });
});
