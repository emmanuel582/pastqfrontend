import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export type HiroseState =
  | "idle"
  | "run-right"
  | "run-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

type HiroseLoadingPetProps = {
  state?: HiroseState;
  size?: "sm" | "md" | "lg";
  label?: string;
};

/**
 * Hirose's published Petdex sprite sheet. Each state is a row of 256x208
 * frames; the sheet is intentionally kept loading-only so the rest of PastQ
 * stays focused on study actions.
 */
const SPRITE = {
  frameWidth: 192,
  height: 208,
  sheetWidth: 1536,
  sheetHeight: 1872,
  url: "/pets/hirose/sprite.webp",
} as const;

const STATES: Record<HiroseState, { row: number; frames: number; duration: number }> = {
  idle: { row: 0, frames: 6, duration: 170 },
  "run-right": { row: 1, frames: 8, duration: 105 },
  "run-left": { row: 2, frames: 8, duration: 105 },
  waving: { row: 3, frames: 4, duration: 170 },
  jumping: { row: 4, frames: 5, duration: 150 },
  failed: { row: 5, frames: 8, duration: 170 },
  waiting: { row: 6, frames: 6, duration: 185 },
  running: { row: 7, frames: 6, duration: 115 },
  review: { row: 8, frames: 6, duration: 190 },
};

const SIZES = {
  sm: 0.58,
  md: 0.78,
  lg: 1,
} as const;

function motionFor(state: HiroseState) {
  if (state === "run-right" || state === "run-left" || state === "running") {
    return { x: [0, state === "run-left" ? -5 : 5, 0], rotate: [0, -1, 1, 0] };
  }
  if (state === "jumping") return { y: [0, -10, 0], rotate: [0, -2, 2, 0] };
  if (state === "waving") return { rotate: [0, 2, -2, 0] };
  if (state === "failed") return { x: [0, -3, 3, 0] };
  return { y: [0, -3, 0] };
}

export default function HiroseLoadingPet({ state = "review", size = "lg", label }: HiroseLoadingPetProps) {
  const reducedMotion = useReducedMotion();
  const scale = SIZES[size];
  const config = STATES[state];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (reducedMotion || config.frames <= 1) return;
    const interval = window.setInterval(() => {
      setFrame((current) => (current + 1) % config.frames);
    }, config.duration);
    return () => window.clearInterval(interval);
  }, [config.duration, config.frames, reducedMotion, state]);

  const spriteStyle = useMemo(() => ({
    width: SPRITE.frameWidth * scale,
    height: SPRITE.height * scale,
    backgroundImage: `url(${SPRITE.url})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${SPRITE.sheetWidth * scale}px ${SPRITE.sheetHeight * scale}px`,
    backgroundPosition: `${-(frame * SPRITE.frameWidth * scale)}px ${-(config.row * SPRITE.height * scale)}px`,
  }), [config.row, frame, scale]);

  return (
    <motion.div
      className="relative flex items-end justify-center select-none"
      animate={reducedMotion ? undefined : motionFor(state)}
      transition={{ duration: state === "jumping" ? 0.8 : 1.8, repeat: Infinity, ease: "easeInOut" }}
      aria-label={label || `Hirose ${state.replace("-", " ")}`}
      role="img"
    >
      <div style={spriteStyle} aria-hidden="true" />
      <span className="sr-only">{label || `Hirose ${state.replace("-", " ")}`}</span>
    </motion.div>
  );
}
