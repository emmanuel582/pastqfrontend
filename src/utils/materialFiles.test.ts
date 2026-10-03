import { describe, expect, it } from 'vitest';
import { classifyMaterialFiles, isPhoneCameraDevice } from './materialFiles';

describe('material files', () => {
  it('accepts phone photos with missing MIME types and preserves page order', () => {
    const files = [new File(['two'], 'page-2.HEIC'), new File(['one'], 'page-1.jpg')];
    expect(classifyMaterialFiles(files)).toEqual({ kind: 'photos', files });
  });
  it('rejects unsupported, empty or mixed text/photo selections', () => {
    expect(() => classifyMaterialFiles([new File(['bad'], 'paper.exe')])).toThrow('Choose photos');
    expect(() => classifyMaterialFiles([new File([], 'empty.jpg')])).toThrow('empty');
    expect(() => classifyMaterialFiles([new File(['text'], 'paper.txt'), new File(['photo'], 'page.jpg')])).toThrow('one text');
  });
  it('offers camera capture for phones without presenting a mock camera on computers', () => {
    expect(isPhoneCameraDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    expect(isPhoneCameraDevice('Mozilla/5.0 (Linux; Android 14)')).toBe(true);
    expect(isPhoneCameraDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true);
    expect(isPhoneCameraDevice('new-mobile-browser', true)).toBe(true);
  });
});
