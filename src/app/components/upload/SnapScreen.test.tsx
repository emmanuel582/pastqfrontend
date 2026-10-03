// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SnapScreen from './SnapScreen';
import { supabase } from '../../../services/supabase';
import { uploadMaterial } from '../../../services/materialUpload';

vi.mock('../../../services/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }));
vi.mock('../../../services/materialUpload', () => ({ uploadMaterial: vi.fn() }));
vi.mock('../../../services/vision', () => ({ sortUploadFiles: (files: File[]) => [...files].sort((a, b) => a.name.localeCompare(b.name)) }));
vi.mock('../ScholarMascot', () => ({ default: () => <div aria-hidden="true" /> }));

let root: Root;
let container: HTMLDivElement;
let getUserMedia: ReturnType<typeof vi.fn>;
const stop = vi.fn();
const nav = vi.fn();
const started = vi.fn();
const draftChanged = vi.fn();
const stream = { getTracks: () => [{ stop }], getVideoTracks: () => [{ addEventListener: vi.fn() }] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('isSecureContext', true);
  getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal('navigator', { userAgent: 'Android 14', mediaDevices: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'test-only' } }, error: null } as any);
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount(files: File[] = []) {
  await act(async () => root.render(<SnapScreen nav={nav} onSessionStarted={started} draft={{ files, name: 'Chemistry' }} onDraftChange={draftChanged} />));
}
function button(label: string) {
  const found = [...container.querySelectorAll('button')].find(element => element.textContent === label || element.getAttribute('aria-label') === label);
  if (!found) throw new Error(`Button missing: ${label}`);
  return found;
}
async function click(label: string) { await act(async () => button(label).click()); }

describe('camera and upload interactions', () => {
  it('shows upload guidance on computers and keeps a native rear-camera input for phones', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', mediaDevices: { getUserMedia } });
    await mount();
    expect(container.textContent).toContain('Please upload your question paper, or use your phone to take a photo.');
    expect(container.querySelector('video')).toBeNull();
    expect([...container.querySelectorAll('button')].some(element => element.textContent === 'Take a photo')).toBe(false);
    expect(container.querySelector('input[capture="environment"]')?.getAttribute('accept')).toBe('image/*');
    expect(getUserMedia).not.toHaveBeenCalled();
  });
  it('captures a real preview frame only after the camera is ready, then releases the camera', async () => {
    await mount(); await click('Take a photo');
    const video = container.querySelector('video')!;
    expect(video.srcObject).toBe(stream);
    expect(button('Take photo').disabled).toBe(true);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as any);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['photo'], { type: 'image/jpeg' })));
    Object.defineProperties(video, { videoWidth: { value: 1920 }, videoHeight: { value: 2560 } });
    await act(async () => video.dispatchEvent(new Event('loadeddata')));
    expect(button('Take photo').disabled).toBe(false);
    await click('Take photo');
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0);
    expect(container.querySelector('video')).toBeNull();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('1 file selected');
    const draft = draftChanged.mock.lastCall?.[0];
    expect(draft.files[0].type).toBe('image/jpeg');
    expect(draft.files[0].size).toBeGreaterThan(0);
  });
  it('offers the native phone camera after permission denial without a simulated preview', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    await mount(); await click('Take a photo');
    expect(container.textContent).toContain('Allow camera access');
    expect(button('Use phone camera')).toBeDefined();
    expect(container.querySelector('video')).toBeNull();
  });
  it('releases a late camera permission response after leaving the screen', async () => {
    let grant!: (value: unknown) => void;
    getUserMedia.mockReturnValue(new Promise(resolve => { grant = resolve; }));
    await mount(); await click('Take a photo');
    await act(async () => root.render(<div>Another screen</div>));
    await act(async () => grant(stream));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe('Another screen');
  });
  it('uses the phone camera picker if live camera access is unavailable', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Android', mediaDevices: undefined });
    await mount();
    const picker = container.querySelector('input[capture="environment"]') as HTMLInputElement;
    const openPicker = vi.spyOn(picker, 'click');
    await click('Take a photo');
    expect(openPicker).toHaveBeenCalledOnce();
    expect(getUserMedia).not.toHaveBeenCalled();
  });
  it('prevents duplicate submissions, preserves files after failure, and opens a successful upload', async () => {
    const file = new File(['Question one'], 'paper.txt', { type: 'text/plain' });
    let rejectUpload!: (error: Error) => void;
    vi.mocked(uploadMaterial).mockReturnValueOnce(new Promise((_, reject) => { rejectUpload = reject; }));
    await mount([file]);
    await act(async () => { const submit = button('Prepare questions'); submit.click(); submit.click(); });
    expect(uploadMaterial).toHaveBeenCalledTimes(1);
    await act(async () => rejectUpload(new Error('Connection interrupted. Please try again.')));
    expect(container.textContent).toContain('paper.txt');
    expect(container.textContent).toContain('Connection interrupted');
    expect(nav).not.toHaveBeenCalled();
    vi.mocked(uploadMaterial).mockResolvedValueOnce('ready-session');
    await click('Prepare questions');
    expect(started).toHaveBeenCalledWith('ready-session');
    expect(nav).toHaveBeenCalledWith('processing');
    expect(draftChanged).toHaveBeenLastCalledWith({ files: [], name: '' });
  });
});
