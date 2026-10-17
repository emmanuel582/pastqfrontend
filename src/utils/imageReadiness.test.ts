// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { whenImageReady } from './imageReadiness';

function image(complete = false, width = 0) {
  const element = document.createElement('img');
  Object.defineProperty(element, 'complete', { configurable: true, value: complete });
  Object.defineProperty(element, 'naturalWidth', { configurable: true, value: width });
  return element;
}
describe('image readiness', () => {
  it('waits for decoding even when the image is already cached', async () => {
    const element = image(true, 100), ready = vi.fn(), failed = vi.fn();
    let decoded!: () => void;
    element.decode = () => new Promise(resolve => { decoded = resolve; });
    whenImageReady(element, ready, failed);
    expect(ready).not.toHaveBeenCalled();
    decoded(); await Promise.resolve();
    expect(ready).toHaveBeenCalledOnce(); expect(failed).not.toHaveBeenCalled();
  });
  it('settles a network failure once instead of keeping a skeleton forever', () => {
    const element = image(), ready = vi.fn(), failed = vi.fn();
    whenImageReady(element, ready, failed);
    element.dispatchEvent(new Event('error')); element.dispatchEvent(new Event('error'));
    expect(failed).toHaveBeenCalledOnce(); expect(ready).not.toHaveBeenCalled();
  });
  it('ignores late decoding after unmount or a source change', async () => {
    const element = image(true, 100), ready = vi.fn(); let decoded!: () => void;
    element.decode = () => new Promise(resolve => { decoded = resolve; });
    const cancel = whenImageReady(element, ready, vi.fn()); cancel(); decoded(); await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();
  });
  it('uses the loaded image if a browser rejects decode but has valid pixels', async () => {
    const element = image(true, 100), ready = vi.fn(); element.decode = () => Promise.reject(new Error('decode unavailable'));
    whenImageReady(element, ready, vi.fn()); await Promise.resolve(); expect(ready).toHaveBeenCalledOnce();
  });
});
