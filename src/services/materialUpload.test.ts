import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadMaterial } from './materialUpload';
import { createVisionSession, extractVisionText, startVisionSession, uploadSessionPages, uploadSessionPdf } from './vision';
import { preparePhoto } from '../utils/materialFiles';

vi.mock('./vision', () => ({ createVisionSession: vi.fn(), extractVisionText: vi.fn(), startVisionSession: vi.fn(), uploadSessionPages: vi.fn(), uploadSessionPdf: vi.fn() }));
vi.mock('../utils/materialFiles', async importOriginal => ({ ...await importOriginal<typeof import('../utils/materialFiles')>(), preparePhoto: vi.fn(async (file: File) => file) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createVisionSession).mockResolvedValue({ id: 'session-one', name: 'Test', status: 'uploading' });
  vi.mocked(uploadSessionPages).mockResolvedValue({ id: 'session-one', name: 'Test', status: 'uploading' });
  vi.mocked(uploadSessionPdf).mockResolvedValue();
  vi.mocked(startVisionSession).mockResolvedValue({ id: 'session-one', name: 'Test', status: 'processing' });
});
const photo = (name: string) => new File(['page'], name, { type: 'image/jpeg' });

describe('material upload flow', () => {
  it('uploads every photo in ordered batches before starting processing', async () => {
    const files = Array.from({ length: 10 }, (_, index) => photo(`page-${10 - index}.jpg`));
    const progress = vi.fn();
    expect(await uploadMaterial(files, '  Chemistry  ', progress)).toBe('session-one');
    expect(createVisionSession).toHaveBeenCalledWith({ name: 'Chemistry' });
    expect(preparePhoto).toHaveBeenCalledTimes(10);
    expect(uploadSessionPages).toHaveBeenNthCalledWith(1, 'session-one', files.slice(0, 8), 0);
    expect(uploadSessionPages).toHaveBeenNthCalledWith(2, 'session-one', files.slice(8), 8);
    expect(vi.mocked(startVisionSession).mock.invocationCallOrder[0]).toBeGreaterThan(vi.mocked(uploadSessionPages).mock.invocationCallOrder[1]);
    expect(progress).toHaveBeenLastCalledWith({ done: 10, total: 10, label: 'Photos uploaded' });
  });
  it('does not start processing if a later upload batch fails', async () => {
    vi.mocked(uploadSessionPages).mockResolvedValueOnce({ id: 'session-one', name: 'Test', status: 'uploading' }).mockRejectedValueOnce(new Error('Connection lost'));
    await expect(uploadMaterial(Array.from({ length: 9 }, (_, index) => photo(`${index}.jpg`)), '', vi.fn())).rejects.toThrow('Connection lost');
    expect(startVisionSession).not.toHaveBeenCalled();
  });
  it('rejects mixed PDFs and photos before creating a session', async () => {
    await expect(uploadMaterial([photo('one.jpg'), new File(['paper'], 'paper.pdf', { type: 'application/pdf' })], '', vi.fn())).rejects.toThrow('one PDF');
    expect(createVisionSession).not.toHaveBeenCalled();
  });
  it('uploads a PDF through the PDF endpoint without starting it twice', async () => {
    const file = new File(['paper'], 'paper.pdf', { type: 'application/pdf' });
    expect(await uploadMaterial([file], 'Physics', vi.fn())).toBe('session-one');
    expect(uploadSessionPdf).toHaveBeenCalledWith('session-one', file);
    expect(startVisionSession).not.toHaveBeenCalled();
  });
  it('imports text using its returned session and rejects whitespace-only files', async () => {
    vi.mocked(extractVisionText).mockResolvedValue({ sessionId: 'text-session', status: 'processing' });
    expect(await uploadMaterial([new File(['Question one'], 'paper.txt', { type: 'text/plain' })], 'Text paper', vi.fn())).toBe('text-session');
    expect(extractVisionText).toHaveBeenCalledWith({ text: 'Question one', name: 'Text paper' });
    await expect(uploadMaterial([new File(['  '], 'empty.txt')], '', vi.fn())).rejects.toThrow('no text');
    expect(extractVisionText).toHaveBeenCalledTimes(1);
    expect(createVisionSession).not.toHaveBeenCalled();
  });
  it('rejects an incomplete server response instead of opening an empty loader', async () => {
    vi.mocked(extractVisionText).mockResolvedValue({ status: 'processing' });
    await expect(uploadMaterial([new File(['Question'], 'paper.md')], '', vi.fn())).rejects.toThrow('could not be opened');
  });
});
