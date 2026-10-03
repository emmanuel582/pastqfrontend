import { useEffect, useState, type CSSProperties } from 'react';

export type ScholarState = 'idle' | 'study' | 'thinking' | 'waiting' | 'celebrate' | 'encourage';
const SPRITE_URL = '/pets/scholar/spritesheet.webp';
// Scholar v2: eight 192 × 208 cells per row; trailing empty cells are excluded.
const poses: Record<ScholarState, { row: number; frames: number; seconds: number }> = {
  idle: { row: 0, frames: 7, seconds: 1.75 },
  study: { row: 8, frames: 6, seconds: 1.5 },
  thinking: { row: 7, frames: 6, seconds: 1.5 },
  waiting: { row: 6, frames: 6, seconds: 1.8 },
  celebrate: { row: 4, frames: 5, seconds: .85 },
  encourage: { row: 5, frames: 8, seconds: 2 },
};

export default function ScholarMascot({ state = 'study', compact = false }: { state?: ScholarState; compact?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const pose = poses[state];
  useEffect(() => {
    let active = true;
    const sprite = new Image();
    sprite.src = SPRITE_URL;
    sprite.decode().then(() => { if (active) setLoaded(true); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  const style = {
    '--scholar-row': pose.row, '--scholar-frames': pose.frames,
    '--scholar-duration': `${pose.seconds}s`, backgroundImage: `url(${SPRITE_URL})`,
  } as CSSProperties;
  return <div className={`scholar-scene ${compact ? 'scholar-compact' : ''}`} aria-hidden="true">
    {!compact && <svg className="scholar-books" viewBox="0 0 360 320" fill="none">
      <path d="M32 264h76v13H32zm5-15h67v15H37zm218 11h73v15h-73zm7-15h58v15h-58z" fill="var(--study-panel)" />
      <path d="M32 264h76v13H32zm5-15h67v15H37zm218 11h73v15h-73zm7-15h58v15h-58zM43 257h48m-51 14h61m163-4h53m-44-15h39" stroke="var(--study-art-ink)" strokeOpacity=".35" strokeWidth="1.2" />
      <path d="M20 278h320" stroke="var(--study-line)" />
    </svg>}
    <span className="scholar-ground" />
    {!failed && <div key={state} className="scholar-sprite" data-loaded={loaded} style={style} />}
    {failed && <svg className="scholar-fallback" viewBox="0 0 120 100" fill="none"><path d="M16 24c18-7 31-5 44 2 13-7 26-9 44-2v54c-18-7-31-5-44 2-13-7-26-9-44-2zM60 26v54M27 39h20m-20 12h20m-20 12h14m33-24h18m-18 12h18m-18 12h12" stroke="currentColor" strokeWidth="2" /></svg>}
  </div>;
}
