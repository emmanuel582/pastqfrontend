import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import localforage from 'localforage';
import { ensureBundleImages, getOfflineBundle, getOfflineLibrary, saveBundle } from './libraryService';
import { UTME_BUNDLE_ID } from '../utils/utme';
vi.mock('localforage', () => ({ default: { config: vi.fn(), setItem: vi.fn(), getItem: vi.fn(), iterate: vi.fn() } }));
const items = new Map<string, any>();
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  items.clear();
  vi.mocked(localforage.setItem).mockImplementation(async (key, value) => { items.set(key, value); return value; });
  vi.mocked(localforage.getItem).mockImplementation(async key => items.get(key) || null);
  vi.mocked(localforage.iterate).mockImplementation(async callback => { for (const [key, value] of items) callback(value, key, 0); return undefined as any; });
});

describe('repairing saved question images', () => {
  const key = 'b'.repeat(64);
  const complete = { id:'public-diagrams', sourceAudit:{questions:1,imageReferences:1}, questions:[{question:'[Illustration] Which part is labelled?',questionHtml:`<img src="pastq-asset:${key}">`}], assets:{[key]:{mime:'image/png',data:'YWJj'}} };
  it('repairs and caches an image-less download without requiring more questions', async () => {
    const old = { ...complete, assets:{} };
    await saveBundle(old);
    const fetcher = vi.fn().mockResolvedValue({ok:true,json:async()=>complete});
    vi.stubGlobal('fetch',fetcher);vi.stubGlobal('navigator',{onLine:true});
    const onRepair=vi.fn(), repaired=await ensureBundleImages(old,onRepair);
    expect(repaired.questions).toHaveLength(old.questions.length);
    expect(repaired.assets[key]).toEqual(complete.assets[key]);
    expect((await getOfflineBundle(old.id)).assets[key]).toEqual(complete.assets[key]);
    expect(fetcher).toHaveBeenCalledOnce();expect(onRepair).toHaveBeenCalledOnce();
    await ensureBundleImages(repaired);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('leaves the old copy intact if a repair is unavailable, and works offline with complete images', async () => {
    const old={...complete,assets:{}};
    await saveBundle(old);
    vi.stubGlobal('navigator',{onLine:false});
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    await expect(ensureBundleImages(old)).rejects.toThrow('Connect once');
    expect(fetcher).not.toHaveBeenCalled();
    expect(await ensureBundleImages(complete)).toBe(complete);
    vi.stubGlobal('navigator',{onLine:true});
    fetcher.mockResolvedValue({ok:true,json:async()=>old});
    await expect(ensureBundleImages(old)).rejects.toThrow('Could not restore');
    expect((await getOfflineBundle(old.id)).assets).toEqual({});
  });
});
describe('private saved upload cache', () => {
  it('shows one complete UTME download and upgrades saved subject links without losing private material', async () => {
    await saveBundle({ id: 'utme2027-res-biology', title: 'Old Biology', questions: [{ subject: 'Biology' }] });
    const imageKey = 'c'.repeat(64);
    await saveBundle({ id: UTME_BUNDLE_ID, title: 'UTME', kind: 'utme-bank', sourceAudit: { questions: 2, imageReferences: 1 }, assets: { [imageKey]: { mime: 'image/png', data: 'YWJj' } }, questions: [{ subject: 'Biology', questionHtml: `<img src="pastq-asset:${imageKey}">` }, { subject: 'Physics' }] });
    await saveBundle({ id: 'my-paper', sourceSessionId: 'my-paper', ownerId: 'student-a', questions: [] });
    expect((await getOfflineLibrary('student-a')).map(item => item.id).sort()).toEqual(['my-paper', UTME_BUNDLE_ID].sort());
    expect((await getOfflineBundle('utme2027-res-biology')).questions).toHaveLength(2);
    expect((await getOfflineLibrary('student-b')).map(item => item.id)).toEqual([UTME_BUNDLE_ID]);
  });
  it('keeps uploads scoped to the account while retaining public downloads', async () => {
    await saveBundle({ id: 'paper-a', title: 'My paper', sourceSessionId: 'paper-a', ownerId: 'student-a', approvedAt: 'saved', questions: [] });
    await saveBundle({ id: 'public-paper', title: 'Public paper', questions: [] });
    expect((await getOfflineLibrary('student-a')).map(item => item.id)).toHaveLength(2);
    expect((await getOfflineLibrary('student-b')).map(item => item.id)).toEqual(['public-paper']);
    expect(await getOfflineBundle('paper-a', 'student-b')).toBeNull();
    expect((await getOfflineBundle('paper-a', 'student-a')).title).toBe('My paper');
  });
  it('retains usable older subject downloads when the combined download is missing its images', async () => {
    await saveBundle({ id:'utme2027-res-biology', questions:[{subject:'Biology',question:'A complete older question'}] });
    await saveBundle({ id:UTME_BUNDLE_ID,kind:'utme-bank',sourceAudit:{questions:1,imageReferences:1},questions:[{subject:'Biology',question:'[Illustration] A question'}] });
    expect((await getOfflineBundle('utme2027-res-biology')).id).toBe('utme2027-res-biology');
    expect(await getOfflineLibrary()).toHaveLength(2);
  });
});
