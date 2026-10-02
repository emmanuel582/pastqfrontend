import MathText from "./MathText";
import { apiUrl } from "../../services/api";

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
      {shown.map((f, i) => (
        <figure key={`${f.url}-${i}`} className="bg-white border border-[#EADFD3] rounded-xl p-2">
          <img
            src={apiUrl(f.url!)}
            alt={f.description || f.caption || "Question figure"}
            loading="lazy"
            className="max-w-full h-auto mx-auto"
          />
          {f.caption && <figcaption className="text-[11px] text-[#8C8681] text-center mt-1">{f.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
