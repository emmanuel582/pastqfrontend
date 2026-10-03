// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScholarMascot from './ScholarMascot';

let root: Root;
let container: HTMLDivElement;
let reduced: boolean;
let hidden: boolean;
beforeEach(() => {
  vi.useFakeTimers(); reduced = false; hidden = false;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('Image', class { src = ''; decode() { return Promise.resolve(); } });
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
async function mount(state: 'study' | 'celebrate' = 'study') { await act(async () => root.render(<ScholarMascot state={state} />)); }
async function advance(ms: number) { await act(async () => vi.advanceTimersByTime(ms)); }
const sprite = () => container.querySelector<HTMLElement>('.scholar-sprite')!;

describe('Scholar pacing', () => {
  it('waits naturally, then varies gestures with an idle interval between each', async () => {
    await mount(); expect(sprite().dataset.loaded).toBe('true');
    expect(sprite().dataset.action).toBe('idle');
    await advance(2500); expect(sprite().style.getPropertyValue('--scholar-frame')).toBe('0');
    await advance(6720); expect(sprite().dataset.action).toBe('study');
    await advance(8150); expect(sprite().dataset.action).toBe('idle');
    await advance(9220); expect(sprite().dataset.action).toBe('thinking');
    await advance(7900 + 9220); expect(sprite().dataset.action).toBe('wave');
  });
  it('does not restart an action when progress rerenders its parent', async () => {
    await mount(); await advance(10070);
    expect(sprite().dataset.action).toBe('study');
    const frame = sprite().style.getPropertyValue('--scholar-frame');
    await mount(); expect(sprite().style.getPropertyValue('--scholar-frame')).toBe(frame);
  });
  it('celebrates once and holds a smile, even after returning to the app', async () => {
    await mount('celebrate'); await advance(4100);
    expect(sprite().dataset.action).toBe('smile');
    await advance(60000); expect(sprite().dataset.action).toBe('smile');
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(sprite().dataset.action).toBe('smile'); expect(vi.getTimerCount()).toBe(0);
  });
  it('pauses offscreen without racing through missed actions on return', async () => {
    await mount(); await advance(1000); hidden = true;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    const frame = sprite().style.getPropertyValue('--scholar-frame');
    await advance(60000); expect(sprite().style.getPropertyValue('--scholar-frame')).toBe(frame);
    hidden = false; await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    await advance(2600); expect(sprite().style.getPropertyValue('--scholar-frame')).toBe('1');
  });
  it('respects reduced motion', async () => {
    reduced = true; await mount(); expect(sprite().dataset.action).toBe('rest');
    expect(vi.getTimerCount()).toBe(0); await advance(60000);
    expect(sprite().style.getPropertyValue('--scholar-frame')).toBe('0');
  });
  it('stops its active animation timer when the screen closes', async () => {
    await mount(); expect(vi.getTimerCount()).toBeGreaterThan(0);
    await act(async () => root.render(<div />)); expect(vi.getTimerCount()).toBe(0);
  });
});
