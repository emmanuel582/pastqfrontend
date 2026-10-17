/** Settle cached and network images only after decoding; release listeners on unmount/source changes. */
export function whenImageReady(image: HTMLImageElement, ready: () => void, failed: () => void): () => void {
  let active = true, decoding = false, settled = false;
  const finish = (success: boolean) => {
    if (!active || settled) return;
    settled = true;
    image.removeEventListener('load', load); image.removeEventListener('error', error);
    success ? ready() : failed();
  };
  const error = () => finish(false);
  const load = () => {
    if (decoding || settled) return;
    if (!image.naturalWidth) { error(); return; }
    decoding = true;
    if (typeof image.decode !== 'function') { finish(true); return; }
    image.decode().then(() => finish(true), () => finish(image.complete && image.naturalWidth > 0));
  };
  image.addEventListener('load', load); image.addEventListener('error', error);
  if (image.complete) load();
  return () => { active = false; image.removeEventListener('load', load); image.removeEventListener('error', error); };
}
