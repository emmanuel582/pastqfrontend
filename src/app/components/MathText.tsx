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
    katex?: any;
  }
}

export const MathText: React.FC<MathTextProps> = ({ text, className, style }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerText = text || "";

    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(containerRef.current, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false },
          ],
          throwOnError: false,
        });
      } catch {
        // Fallback to text if KaTeX parse fails
      }
    }
  }, [text]);

  return <span ref={containerRef} className={className} style={style}>{text}</span>;
};

export default MathText;
