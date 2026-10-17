import React, { useEffect, useMemo, useRef, useState } from "react";
import ReadyImage from './ReadyImage';
import { whenImageReady } from '../../utils/imageReadiness';
import StudyDialog from './StudyDialog';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { sourceHtmlFragment, type SourceAssets } from "../../utils/sourceHtml";

interface MathTextProps {
  text: string;
  html?: string;
  assets?: SourceAssets;
  zoomImages?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    renderMathInElement?: (
      el: HTMLElement,
      options?: {
        delimiters: Array<{ left: string; right: string; display: boolean }>;
        throwOnError?: boolean;
      }
    ) => void;
    katex?: unknown;
  }
}

/** Spoken / OCR math → inline LaTeX so KaTeX can render it in CBT. */
export function normalizeSpokenMath(raw: string): string {
  let s = String(raw || "");
  if (!s.trim()) return s;

  const blocks: string[] = [];
  s = s.replace(
    /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g,
    (m) => {
      const i = blocks.length;
      blocks.push(m);
      return `\u0000MATH${i}\u0000`;
    }
  );

  s = s.replace(
    /\b(\d+(?:\.\d+)?|[A-Za-z])\s*(?:raise(?:d)?(?:\s+to(?:\s+the(?:\s+power(?:\s+of)?)?)?)?)\s+(\d+(?:\.\d+)?|[A-Za-z])\b/gi,
    (_m, base: string, exp: string) => `$${base}^{${exp}}$`
  );
  s = s.replace(/\b(\d+(?:\.\d+)?|[A-Za-z])\s+squared\b/gi, (_m, b: string) => `$${b}^2$`);
  s = s.replace(/\b(\d+(?:\.\d+)?|[A-Za-z])\s+cubed\b/gi, (_m, b: string) => `$${b}^3$`);
  s = s.replace(
    /square\s+roots?\s+of\s*\(?\s*([A-Za-z0-9+\-*/^=_\\{}]+(?:\s+[A-Za-z0-9+\-*/^=_\\{}]+){0,6})\s*\)?/gi,
    (_m, x: string) => `$\\sqrt{${String(x).trim()}}$`
  );
  s = s.replace(
    /cube\s+roots?\s+of\s*\(?\s*([A-Za-z0-9+\-*/^=_\\{}]+(?:\s+[A-Za-z0-9+\-*/^=_\\{}]+){0,6})\s*\)?/gi,
    (_m, x: string) => `$\\sqrt[3]{${String(x).trim()}}$`
  );
  s = s.replace(
    /\bfraction\s+([^,\n]{1,30}?)\s+over\s+([^,\n.]{1,30}?)(?=[,.;)\s]|$)/gi,
    (_m, a: string, b: string) => `$\\frac{${String(a).trim()}}{${String(b).trim()}}$`
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?|[A-Za-z])\s+over\s+(\d+(?:\.\d+)?|[A-Za-z])\b/gi,
    (_m, a: string, b: string) => `$\\frac{${a}}{${b}}$`
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?|[A-Za-z])\s+to\s+the\s+power\s+of\s+(\d+(?:\.\d+)?|[A-Za-z])\b/gi,
    (_m, base: string, exp: string) => `$${base}^{${exp}}$`
  );

  return s.replace(/\u0000MATH(\d+)\u0000/g, (_m, i: string) => blocks[Number(i)] || "");
}

/** Extracted text marks emphasised words as *word*; render them as <em>, leaving math spans untouched. */
function fillWithEmphasis(el: HTMLElement, text: string) {
  el.textContent = "";
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\*[^*\n]+?\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      const em = document.createElement("em");
      em.textContent = part.slice(1, -1);
      el.appendChild(em);
    } else {
      el.appendChild(document.createTextNode(part));
    }
  }
}

function renderKatex(el: HTMLElement) {
  if (!window.renderMathInElement) return false;
  try {
    window.renderMathInElement(el, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
    return true;
  } catch {
    return false;
  }
}

export const MathText: React.FC<MathTextProps> = ({ text, html, assets, zoomImages = false, className, style }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const display = normalizeSpokenMath(text || "");
  const content = useMemo(() => ({ display, html, assets }), [display, html, assets]);
  const [readyContent, setReadyContent] = useState<typeof content | null>(null);
  const needsMath = !html && /\$|\\\[|\\\(/.test(display);
  const pending = Boolean(html || needsMath) && readyContent !== content;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let active = true;
    const finish = () => { if (active) setReadyContent(content); };

    if (html) {
      el.replaceChildren(sourceHtmlFragment(html, assets));
      if (zoomImages) for (const image of el.querySelectorAll('img')) {
        image.tabIndex = 0;
        image.setAttribute('role', 'button');
        image.setAttribute('aria-label', 'Enlarge question image');
      }
      const images = [...el.querySelectorAll('img')];
      let remaining = images.length;
      if (!remaining) finish();
      const settled = () => { if (--remaining === 0) finish(); };
      const cleanup = images.map(image => whenImageReady(image, settled, () => {
        const fallback = document.createElement('span');
        fallback.className = 'source-image-missing';
        fallback.setAttribute('role', 'status');
        fallback.textContent = 'Image unavailable. Reopen this material when connected.';
        image.replaceWith(fallback); settled();
      }));
      return () => { active = false; cleanup.forEach(cancel => cancel()); };
    }
    fillWithEmphasis(el, display);

    if (!needsMath || renderKatex(el)) { finish(); return () => { active = false; }; }

    // KaTeX scripts are deferred — retry briefly until auto-render is ready
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      if (renderKatex(el) || tries > 40) {
        window.clearInterval(id);
        finish();
      }
    }, 50);

    return () => { active = false; window.clearInterval(id); };
  }, [content, zoomImages, needsMath]);

  function enlarge(target: EventTarget | null) {
    if (!zoomImages || !(target instanceof HTMLImageElement)) return;
    setImageScale(1);
    setImage({ src: target.src, alt: target.alt });
  }

  return (
    <><span className="content-readiness" data-pending={pending} data-images={Boolean(html && /<img\b/i.test(html))} aria-busy={pending}><span ref={containerRef} aria-hidden={pending || undefined} className={['math-content', className, html && 'source-content'].filter(Boolean).join(' ')} style={style} onClick={event => enlarge(event.target)} onKeyDown={event => { if (zoomImages && event.target instanceof HTMLImageElement && ['Enter', ' '].includes(event.key)) { event.preventDefault(); enlarge(event.target); } }}>
      {display}
    </span>{pending && <span className="skeleton-block image-skeleton" aria-hidden="true" />}</span>{image && <StudyDialog title="Question image" className="question-image-dialog" onClose={() => setImage(null)}><div className="question-image-full"><ReadyImage src={image.src} alt={image.alt} style={{ width: `${imageScale * 100}%`, maxHeight: imageScale === 1 ? '60dvh' : 'none' }} /></div><div className="question-image-tools"><button className="icon-button" aria-label="Zoom out image" disabled={imageScale <= 1} onClick={() => setImageScale(value => Math.max(1, value - .5))}><Minus size={18} /></button><output aria-live="polite">{Math.round(imageScale * 100)}%</output><button className="icon-button" aria-label="Zoom in image" disabled={imageScale >= 4} onClick={() => setImageScale(value => Math.min(4, value + .5))}><Plus size={18} /></button><button className="text-button" onClick={() => setImageScale(1)}><RotateCcw size={15} />Fit</button></div></StudyDialog>}</>
  );
};

export default MathText;
