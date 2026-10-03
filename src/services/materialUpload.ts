import { classifyMaterialFiles, preparePhoto } from '../utils/materialFiles';
import { createVisionSession, extractVisionText, startVisionSession, uploadSessionPages, uploadSessionPdf } from './vision';

export type MaterialUploadProgress = { done: number; total: number; label: string };

export async function uploadMaterial(files: File[], name: string, onProgress: (progress: MaterialUploadProgress) => void): Promise<string> {
  const material = classifyMaterialFiles(files);
  const title = name.trim() || 'New material';
  onProgress({ done: 0, total: files.length, label: 'Preparing your material' });
  if (material.kind === 'text') {
    const text = await files[0].text();
    if (!text.trim()) throw new Error('This file has no text. Choose another file.');
    const result = await extractVisionText({ text, name: title });
    const id = result.sessionId || result.jobId;
    if (!id) throw new Error('Your upload could not be opened. Please try again.');
    onProgress({ done: 1, total: 1, label: 'Material uploaded' });
    return id;
  }
  const session = await createVisionSession({ name: title });
  if (!session.id) throw new Error('Your upload could not be opened. Please try again.');
  if (material.kind === 'pdf') {
    onProgress({ done: 0, total: 1, label: 'Uploading your PDF' });
    await uploadSessionPdf(session.id, files[0]);
    onProgress({ done: 1, total: 1, label: 'Material uploaded' });
  } else {
    for (let index = 0; index < files.length; index += 8) {
      const pages: File[] = [];
      onProgress({ done: index, total: files.length, label: 'Preparing your photos' });
      for (const file of files.slice(index, index + 8)) pages.push(await preparePhoto(file));
      onProgress({ done: index, total: files.length, label: 'Uploading your photos' });
      await uploadSessionPages(session.id, pages, index);
      onProgress({ done: index + pages.length, total: files.length, label: 'Photos uploaded' });
    }
    // Start only after every batch succeeds; never process a partial upload.
    await startVisionSession(session.id);
  }
  return session.id;
}
