import MathText from "./MathText";
import { apiUrl } from "../../services/api";
import ReadyImage from './ReadyImage';
import { useEffect, useState } from 'react';
import { protectedFigureUrl, protectedFigureData } from '../../services/protectedMedia';

export interface QuestionFigure {
  url?: string | null;
  kind?: string;
  caption?: string | null;
  description?: string;
}

/**
 * Shared passage and exact figure crops for a question. Figures are the
 * original page pixels cropped by the extraction engine; the model's
 * description is the alt text.
 */
export function questionFigureSource(url: string): string | null {
  if (/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]+$/.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return apiUrl(url);
  return null;
}

function Figure({ figure }: { figure: QuestionFigure }) {
  const privateUrl = protectedFigureUrl(figure.url || '');
  const [privateSource, setPrivateSource] = useState<{ url: string; data: string | null } | null>(null);
  useEffect(() => {
    if (!privateUrl) return;
    let active = true;
    protectedFigureData(privateUrl).then(data => { if (active) setPrivateSource({ url: privateUrl, data }); }).catch(() => { if (active) setPrivateSource({ url: privateUrl, data: null }); });
    return () => { active = false; };
  }, [privateUrl]);
  const pending = privateUrl && privateSource?.url !== privateUrl;
  const source = privateUrl ? privateSource?.url === privateUrl ? privateSource.data : null : questionFigureSource(figure.url || '');
  return <figure className="question-figure">
    {pending ? <span className="skeleton-block" style={{ height: 160 }} role="status" aria-label="Loading diagram" /> : source ? <ReadyImage src={source} alt={figure.description || figure.caption || 'Question figure'} loading="eager" decoding="async" className="max-w-full h-auto mx-auto" /> : <p className="source-image-missing" role="status">Image unavailable. Reopen this material when connected.</p>}
    {figure.caption && <figcaption className="text-[11px] text-[#8C8681] text-center mt-1">{figure.caption}</figcaption>}
  </figure>;
}

export default function QuestionMedia({ passage, figures, assets }: { passage?: string | null; figures?: QuestionFigure[]; assets?:import('../../utils/sourceHtml').SourceAssets }) {
  const shown = (figures || []).filter((f) => f?.url);
  if (!passage && !shown.length) return null;
  return (
    <div className="mb-3 space-y-2">
      {passage && (
        <div className="text-[13px] text-[#4A4440] bg-[#FAF6F0] border border-[#EADFD3] rounded-xl px-3 py-2 leading-relaxed whitespace-pre-line">
          <MathText text={passage} html={/<(?:p|div|table|img|math)\b/i.test(passage)?passage:undefined} assets={assets} zoomImages />
        </div>
      )}
      {shown.map((f, i) => <Figure key={`${f.url}-${i}`} figure={f} />)}
    </div>
  );
}
