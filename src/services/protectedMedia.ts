import { supabase } from './supabase';
import { apiUrl } from './api';

export function protectedFigureUrl(value: string): string | null {
  try {
    const api = new URL(apiUrl('/'), window.location.origin), url = new URL(value, api);
    return url.origin === api.origin && /^\/api\/library\/figures\/[A-Za-z0-9-]{8,64}\/p\d{6}-f\d+-[a-f0-9]{12}\.jpg$/.test(url.pathname) && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
}
export async function protectedFigureData(value: string, owner?: string): Promise<string> {
  const url = protectedFigureUrl(value);
  if (!url) throw new Error('Invalid private figure.');
  const { data } = await supabase.auth.getSession();
  if (!data.session || owner && data.session.user.id !== owner) throw new Error('Sign in to the owner account to save these diagrams.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load a private diagram. Reconnect and try again.');
    const blob = await response.blob();
    if (!/^image\/(png|jpeg|gif|webp)$/.test(blob.type) || !blob.size || blob.size > 20 * 1024 * 1024) throw new Error('Invalid diagram data.');
    const result = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
    if (typeof createImageBitmap === 'function') { const image=await createImageBitmap(blob);if(!image.width||!image.height)throw new Error('The diagram could not decode.');image.close(); }
    const current = await supabase.auth.getSession();
    if (current.data.session?.user.id !== data.session.user.id) throw new Error('Your account changed. Reopen this material.');
    return result;
  } finally { clearTimeout(timer); }
}

/** Embed protected bytes before committing an offline bundle; never persist bearer tokens. */
export async function preparePrivateMedia(bundle: any) {
  if (!bundle.sourceSessionId) return bundle;
  if (!bundle.ownerId) throw new Error('This private material needs its owner account.');
  const result = structuredClone(bundle), images = new Map<string, Promise<string>>();
  const load = (value: string) => {
    if (!images.has(value)) images.set(value, protectedFigureData(value, bundle.ownerId));
    return images.get(value)!;
  };
  for (const question of result.questions || []) {
    for (const figure of question.figures || []) if (protectedFigureUrl(figure.url || '')) figure.url = await load(figure.url);
    const html = async (value: string) => {
      if (!value?.includes('<img')) return value;
      const template = document.createElement('template'); template.innerHTML = value;
      for (const image of template.content.querySelectorAll('img')) if (protectedFigureUrl(image.getAttribute('src') || '')) image.setAttribute('src', await load(image.getAttribute('src')!));
      return template.innerHTML;
    };
    for (const field of ['questionHtml', 'explanationHtml', 'answerHtml', 'passage']) if (typeof question[field] === 'string') question[field] = await html(question[field]);
    if (Array.isArray(question.optionsHtml)) question.optionsHtml = await Promise.all(question.optionsHtml.map(html));
  }
  return result;
}
