import React, { useEffect, useRef } from "react";

interface MathTextProps {
  text: string;
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

export const MathText: React.FC<MathTextProps> = ({ text, className, style }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const display = normalizeSpokenMath(text || "");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerText = display;

    if (renderKatex(el)) return;

    // KaTeX scripts are deferred — retry briefly until auto-render is ready
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      if (renderKatex(el) || tries > 40) {
        window.clearInterval(id);
      }
    }, 50);

    return () => window.clearInterval(id);
  }, [display]);

  return (
    <span ref={containerRef} className={className} style={style}>
      {display}
    </span>
  );
};

export default MathText;
