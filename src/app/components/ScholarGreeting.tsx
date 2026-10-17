import { useEffect, useId, useState } from 'react';

// A continuous displacement field bends the sleeve gradually towards the elbow.
// The palm, wrist and cuff remain one image: no cutout, hinge seam or missing skin.
const waveField = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="192" height="208"><defs><linearGradient id="bend" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(100%,50%,50%)"/><stop offset=".55" stop-color="rgb(100%,50%,50%)"/><stop offset="1" stop-color="rgb(50%,50%,50%)"/></linearGradient><filter id="soft"><feGaussianBlur stdDeviation="1.1"/></filter></defs><rect width="192" height="208" fill="rgb(50%,50%,50%)"/><rect x="48" y="18" width="34" height="64" fill="url(#bend)" filter="url(#soft)"/></svg>')}`;

export default function ScholarGreeting() {
  const id = useId().replace(/:/g, '');
  const [ready, setReady] = useState(false);
  const [eyesReady, setEyesReady] = useState(false);
  const [wave, setWave] = useState(0);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'), update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  return <button type="button" className="welcome-scholar" aria-label="Wave with Scholar" onClick={() => setWave(value => value + 1)}>
    {failed ? <span className="welcome-scholar-fallback" aria-hidden="true">past<span>q</span></span> : <svg viewBox="42 0 108 208" aria-hidden="true" data-ready={ready} data-eyes-ready={eyesReady}>
      <defs>
        <filter id={`${id}-wave`} filterUnits="userSpaceOnUse" x="38" y="0" width="116" height="208" colorInterpolationFilters="sRGB">
          <feImage href={waveField} x="0" y="0" width="192" height="208" result="wave-field" />
          <feDisplacementMap className="welcome-wave-hand" key={wave} in="SourceGraphic" in2="wave-field" scale="0" xChannelSelector="R" yChannelSelector="G">
            {ready && !reduced && <animate attributeName="scale" values="0;7;0;-7;0" dur="2.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.25;.5;.75;1" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1;.45 0 .55 1" />}
          </feDisplacementMap>
        </filter>
        <filter id={`${id}-feather`} x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation=".45" /></filter>
        <mask id={`${id}-eyes`} maskUnits="userSpaceOnUse" x="82" y="20" width="33" height="17"><g fill="white" filter={`url(#${id}-feather)`}><ellipse cx="92.3" cy="27.8" rx="6.5" ry="4.4" /><ellipse cx="105.2" cy="27.8" rx="6.5" ry="4.4" /></g></mask>
      </defs>
      <image className="greeting-body" href="/pets/scholar/wave.png" width="192" height="208" filter={`url(#${id}-wave)`} onLoad={() => setReady(true)} onError={() => setFailed(true)} />
      <g className="greeting-blink"><image href="/pets/scholar/blink.png" x="4" y="-1.5" width="192" height="208" mask={`url(#${id}-eyes)`} onLoad={() => setEyesReady(true)} onError={() => setEyesReady(false)} /></g>
    </svg>}
  </button>;
}
