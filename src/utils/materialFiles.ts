export const MATERIAL_ACCEPT = 'image/*,application/pdf,.txt,.md,.json,text/plain,text/markdown,application/json';
export type MaterialFiles = { kind: 'photos' | 'pdf' | 'text'; files: File[] };

/** Validate before creating a server session; keep the student's page order. */
export function classifyMaterialFiles(files: File[]): MaterialFiles {
  if (!files.length) throw new Error('Choose a file first.');
  if (files.some(file => !file.size)) throw new Error('One of these files is empty. Choose another file.');
  const pdfs = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  const texts = files.filter(f => /\.(txt|md|json)$/i.test(f.name) || /^(text\/|application\/json)/i.test(f.type));
  const photos = files.filter(f => f.type.startsWith('image/') || /\.(heic|heif|jpg|jpeg|png|webp|bmp|tif|tiff)$/i.test(f.name));
  if (pdfs.length + texts.length + photos.length !== files.length) throw new Error('Choose photos, a PDF, or a TXT, Markdown or JSON file.');
  if (pdfs.length) {
    if (files.length !== 1) throw new Error('Upload one PDF at a time. Add photos as a separate material.');
    return { kind: 'pdf', files };
  }
  if (texts.length) {
    if (files.length !== 1) throw new Error('Upload one text file at a time, separately from photos.');
    return { kind: 'text', files };
  }
  return { kind: 'photos', files };
}

export function isPhoneCameraDevice(userAgent: string, mobileHint?: boolean): boolean {
  return mobileHint === true || /Android|iPhone|iPod/i.test(userAgent);
}

/** Keep text and diagrams legible without exhausting a phone's memory. */
export function preparePhoto(file: File, maxDimension = 3200): Promise<File> {
  return new Promise(resolve => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    image.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d');
      if (!context) return resolve(file);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: file.lastModified }) : file), 'image/jpeg', .92);
    };
    image.src = url;
  });
}
