import { useId, useState } from 'react';

/** Animate the wrist and eyelids independently, keeping the face and body anchored. */
export default function ScholarGreeting() {
  const id = useId().replace(/:/g, '');
  const [ready, setReady] = useState(false);
  const [eyesReady, setEyesReady] = useState(false);
  const [wave, setWave] = useState(0);
  const [failed, setFailed] = useState(false);
  const hand = 'M55 25H80V54L73 62H55Z';
  return <button type="button" className="welcome-scholar" aria-label="Wave with Scholar" onClick={() => setWave(value => value + 1)}>
    {failed ? <span className="welcome-scholar-fallback" aria-hidden="true">past<span>q</span></span> : <svg viewBox="42 0 108 208" aria-hidden="true" data-ready={ready} data-eyes-ready={eyesReady}>
      <defs>
        <mask id={`${id}-body`} maskUnits="userSpaceOnUse" x="0" y="0" width="192" height="208"><rect width="192" height="208" fill="white" /><path d={hand} fill="black" /></mask>
        <clipPath id={`${id}-hand`}><path d={hand} /></clipPath>
        <filter id={`${id}-feather`} x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation=".45" /></filter>
        <mask id={`${id}-eyes`} maskUnits="userSpaceOnUse" x="82" y="20" width="33" height="17"><g fill="white" filter={`url(#${id}-feather)`}><ellipse cx="92.3" cy="27.8" rx="6.5" ry="4.4" /><ellipse cx="105.2" cy="27.8" rx="6.5" ry="4.4" /></g></mask>
      </defs>
      <image className="greeting-body" href="/pets/scholar/wave.png" width="192" height="208" mask={`url(#${id}-body)`} onLoad={() => setReady(true)} onError={() => setFailed(true)} />
      <g className="greeting-blink"><image href="/pets/scholar/blink.png" x="4" y="-1.5" width="192" height="208" mask={`url(#${id}-eyes)`} onLoad={() => setEyesReady(true)} onError={() => setEyesReady(false)} /></g>
      <g className="welcome-wave-hand" key={wave}><g clipPath={`url(#${id}-hand)`}><image href="/pets/scholar/wave.png" width="192" height="208" /></g></g>
    </svg>}
  </button>;
}
