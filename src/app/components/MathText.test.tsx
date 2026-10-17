// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MathText from './MathText';

let root: Root, container: HTMLDivElement;
const html = '<p>Use the diagram.</p><img src="data:image/png;base64,AA=="><img src="data:image/png;base64,AQ==">';
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function load(image: HTMLImageElement) {
  Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 100 });
  image.decode = () => Promise.resolve();
  await act(async () => image.dispatchEvent(new Event('load')));
}
describe('question content skeleton', () => {
  it('reveals the question only after every diagram is ready', async () => {
    await act(async () => root.render(<MathText text="raw fallback" html={html} />));
    const region = container.querySelector('.content-readiness')!;
    expect(region.getAttribute('aria-busy')).toBe('true');
    const images = container.querySelectorAll('img');
    await load(images[0]); expect(region.getAttribute('aria-busy')).toBe('true');
    await load(images[1]); expect(region.getAttribute('aria-busy')).toBe('false');
    expect(container.querySelector('.math-content')?.getAttribute('aria-hidden')).toBeNull();
    expect(container.textContent).toBe('Use the diagram.');
  });
  it('shows an explicit image failure and releases loading', async () => {
    await act(async () => root.render(<MathText text="" html={html} />));
    const images = container.querySelectorAll('img');
    await load(images[0]); await act(async () => images[1].dispatchEvent(new Event('error')));
    expect(container.querySelector('.content-readiness')?.getAttribute('aria-busy')).toBe('false');
    expect(container.textContent).toContain('Image unavailable');
  });
  it('starts a fresh skeleton when switching to a new question', async () => {
    await act(async () => root.render(<MathText text="" html={html} />));
    for (const image of container.querySelectorAll('img')) await load(image);
    await act(async () => root.render(<MathText text="" html={html.replace('AA==', 'Ag==')} />));
    expect(container.querySelector('.content-readiness')?.getAttribute('aria-busy')).toBe('true');
    for (const image of container.querySelectorAll('img')) await load(image);
    expect(container.querySelector('.content-readiness')?.getAttribute('aria-busy')).toBe('false');
  });
});
