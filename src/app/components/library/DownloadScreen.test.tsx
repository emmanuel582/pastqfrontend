// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ fail: false, calls: [] as string[] }));
vi.mock('../ScholarMascot', () => ({ default: ({state}: {state: string}) => <div data-scholar-state={state} /> }));
vi.mock('../../../services/libraryService', () => ({ getOfflineBundle: async () => null, saveBundle: async (bundle: any) => bundle }));
vi.mock('../../../services/downloads', () => ({
  formatBytes: (n: number) => `${n} B`, savedDownloadSelection: () => [],
  downloadManifest: async (id: string) => ({ version: 'v1', bundle: { id, title: `Publisher ${id}` }, parts: ['Biology', 'Chemistry'].map(subject => ({ hash: id + subject, subject, year: '2020', paper: '2020', count: 2, bytes: 100, offset: 0 })), totalQuestions: 4, totalBytes: 200 }),
  downloadSelected: async (manifest: any, hashes: string[], commit: any) => { state.calls.push(manifest.bundle.id); if (manifest.bundle.id === 'B' && state.fail) { state.fail = false; throw new Error('Disconnected'); } return commit({ ...manifest.bundle, selected: hashes }); },
}));
import DownloadScreen from './DownloadScreen';
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; state.calls = []; state.fail = false; host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function render(props: any) { await act(async () => { root.render(<DownloadScreen id="A" onBack={vi.fn()} {...props} />); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function click(label: string) { const element = [...host.querySelectorAll<HTMLElement>('button,input')].find(el => el.getAttribute('aria-label') === label || el.textContent === label); expect(element).toBeTruthy(); await act(async () => element!.click()); }
it('starts all subjects once after their manifests load', async () => { const saved = vi.fn(); await render({ mode: 'all', onSaved: saved }); expect(state.calls).toEqual(['A']); expect(saved).toHaveBeenCalledWith(expect.objectContaining({ selected: ['ABiology', 'AChemistry'] }), 1); });
it('waits for an explicit subject selection and keeps the bank identity', async () => { const saved = vi.fn(); await render({ onSaved: saved }); expect(state.calls).toEqual([]); expect([...host.querySelectorAll('button')].find(button => button.textContent?.includes('Save for offline'))?.disabled).toBe(true); await click('Download Biology'); await click('Save for offline'); expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: 'A', selected: ['ABiology'] }), 1); });
it('can choose one publisher from an institution without downloading the other', async () => { const saved = vi.fn(); await render({ ids: ['A', 'B'], onSaved: saved }); await click('All subjects in Publisher B'); await click('Save for offline'); expect(state.calls).toEqual(['B']); expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: 'B' }), 1); });
it('resumes a collection failure without committing successful banks a second time', async () => { state.fail = true; const saved = vi.fn(); await render({ ids: ['A', 'B'], mode: 'all', onSaved: saved }); expect(state.calls).toEqual(['A', 'B']); expect(saved).not.toHaveBeenCalled(); expect(host.textContent).toContain('Disconnected'); await click('Resume download'); expect(state.calls).toEqual(['A', 'B', 'B']); expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: 'B' }), 2); });
it('keeps a partial download on its receipt until the student chooses where to go', async () => {
  const saved=vi.fn(),back=vi.fn(),viewSaved=vi.fn();
  await render({onSaved:saved,onBack:back,onViewSaved:viewSaved});
  await click('Download Biology');await click('Save for offline');
  expect(saved).toHaveBeenCalledTimes(1);expect(back).not.toHaveBeenCalled();expect(viewSaved).not.toHaveBeenCalled();
  expect(host.textContent).toContain('Saved for offline');expect(host.querySelector('[data-scholar-state="celebrate"]')).not.toBeNull();
  expect(host.querySelector('.download-subject')).toBeNull();
  await click('Keep browsing');expect(back).toHaveBeenCalledTimes(1);
  await click('View saved materials');expect(viewSaved).toHaveBeenCalledTimes(1);
});
