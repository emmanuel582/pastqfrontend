import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { scholarMotion, type ScholarFrame, type ScholarState } from '../../utils/scholarMotion';

export type { ScholarState } from '../../utils/scholarMotion';
const SPRITE_URL = '/pets/scholar/spritesheet.webp';

export default function ScholarMascot({ state = 'study', compact = false }: { state?: ScholarState; compact?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [motion, setMotion] = useState<{ poses: [ScholarFrame, ScholarFrame]; active: 0 | 1 }>(() => {
    const first = scholarMotion(state, 0)[0];
    return { poses: [first, first], active: 0 };
  });
  const intent = useRef(state);
  const celebrateNow = useRef<(() => void) | null>(null);
  const pose = motion.poses[motion.active];
  function setPose(next: ScholarFrame) {
    setMotion(current => {
      const same = current.poses[current.active].row === next.row && current.poses[current.active].frame === next.frame;
      const active = same ? current.active : (1 - current.active) as 0 | 1;
      const poses: [ScholarFrame, ScholarFrame] = [...current.poses]; poses[active] = next;
      return { poses, active };
    });
  }
  useEffect(() => {
    intent.current = state;
    if (state === 'celebrate') celebrateNow.current?.();
  }, [state]);
  useEffect(() => {
    let active = true;
    const sprite = new Image();
    sprite.src = SPRITE_URL;
    sprite.decode().then(() => { if (active) setLoaded(true); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded || failed) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout>;
    let turn = 0;
    let index = 0;
    let finished = false;
    let sequence = scholarMotion(intent.current, turn);
    let celebrating = intent.current === 'celebrate';
    function show() {
      clearTimeout(timer);
      if (finished) return;
      if (reduced.matches) {
        setPose({ row: celebrating ? 8 : 0, frame: celebrating ? 5 : 0, hold: 0, blend: 0, action: 'rest' });
        return;
      }
      setPose(sequence[index]);
      if (document.hidden) return;
      timer = setTimeout(() => {
        index++;
        if (index >= sequence.length) {
          // Completion is a single celebration, followed by a quiet smile.
          if (celebrating) { finished = true; setPose({ row: 8, frame: 5, hold: 0, blend: 160, action: 'smile' }); return; }
          sequence = scholarMotion(intent.current, ++turn); index = 0;
        }
        show();
      }, sequence[index].hold);
    }
    celebrateNow.current = () => {
      if (celebrating) return;
      clearTimeout(timer); celebrating = true; finished = false;
      sequence = scholarMotion('celebrate', 0); index = 0; show();
    };
    show();
    document.addEventListener('visibilitychange', show);
    reduced.addEventListener?.('change', show);
    return () => { clearTimeout(timer); celebrateNow.current = null; document.removeEventListener('visibilitychange', show); reduced.removeEventListener?.('change', show); };
  }, [loaded, failed]);
  const style = {
    '--scholar-row': pose.row, '--scholar-frame': pose.frame,
    '--scholar-blend': `${pose.blend}ms`,
  } as CSSProperties;
  return <div className={`scholar-scene ${compact ? 'scholar-compact' : ''}`} aria-hidden="true">
    {!compact && <svg className="scholar-books" viewBox="0 0 360 320" fill="none">
      <path d="M32 264h76v13H32zm5-15h67v15H37zm218 11h73v15h-73zm7-15h58v15h-58z" fill="var(--study-panel)" />
      <path d="M32 264h76v13H32zm5-15h67v15H37zm218 11h73v15h-73zm7-15h58v15h-58zM43 257h48m-51 14h61m163-4h53m-44-15h39" stroke="var(--study-art-ink)" strokeOpacity=".35" strokeWidth="1.2" />
      <path d="M20 278h320" stroke="var(--study-line)" />
    </svg>}
    <span className="scholar-ground" />
    {!failed && <div className="scholar-sprite" data-loaded={loaded} data-action={pose.action} style={style}>
      {motion.poses.map((frame, index) => <span key={index} className="scholar-pose" data-active={motion.active === index} style={{ '--scholar-row': frame.row, '--scholar-frame': frame.frame, opacity: motion.active === index ? 1 : 0, backgroundImage: `url(${SPRITE_URL})` } as CSSProperties} />)}
    </div>}
    {failed && <svg className="scholar-fallback" viewBox="0 0 120 100" fill="none"><path d="M16 24c18-7 31-5 44 2 13-7 26-9 44-2v54c-18-7-31-5-44 2-13-7-26-9-44-2zM60 26v54M27 39h20m-20 12h20m-20 12h14m33-24h18m-18 12h18m-18 12h12" stroke="currentColor" strokeWidth="2" /></svg>}
  </div>;
}
