import MathText from "./MathText";
import { apiUrl } from "../../services/api";
import ReadyImage from './ReadyImage';

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
  const source = questionFigureSource(figure.url || '');
  return <figure className="question-figure">
    {source ? <ReadyImage src={source} alt={figure.description || figure.caption || 'Question figure'} loading="eager" decoding="async" className="max-w-full h-auto mx-auto" /> : <p className="source-image-missing" role="status">Image unavailable. Reopen this material when connected.</p>}
    {figure.caption && <figcaption className="text-[11px] text-[#8C8681] text-center mt-1">{figure.caption}</figcaption>}
  </figure>;
}

export default function QuestionMedia({ passage, figures }: { passage?: string | null; figures?: QuestionFigure[] }) {
  const shown = (figures || []).filter((f) => f?.url);
  if (!passage && !shown.length) return null;
  return (
    <div className="mb-3 space-y-2">
      {passage && (
        <div className="text-[13px] text-[#4A4440] bg-[#FAF6F0] border border-[#EADFD3] rounded-xl px-3 py-2 leading-relaxed whitespace-pre-line">
          <MathText text={passage} />
        </div>
      )}
      {shown.map((f, i) => <Figure key={`${f.url}-${i}`} figure={f} />)}
    </div>
  );
}
