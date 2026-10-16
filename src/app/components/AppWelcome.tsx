import { useId, useState } from 'react';

/** A single greeting pose: only the raised hand moves; the body stays anchored. */
function ScholarGreeting() {
  const id = useId().replace(/:/g, '');
  const [ready, setReady] = useState(false);
  const [wave, setWave] = useState(0);
  const [failed, setFailed] = useState(false);
  const hand = 'M55 25H80V54L73 62H55Z';
  return <button type="button" className="welcome-scholar" aria-label="Wave with Scholar" onClick={() => setWave(value => value + 1)}>
    {failed ? <span className="welcome-scholar-fallback" aria-hidden="true">past<span>q</span></span> : <svg viewBox="0 0 192 208" aria-hidden="true" data-ready={ready}>
      <defs>
        <mask id={`${id}-body`} maskUnits="userSpaceOnUse" x="0" y="0" width="192" height="208"><rect width="192" height="208" fill="white" /><path d={hand} fill="black" /></mask>
        <clipPath id={`${id}-hand`}><path d={hand} /></clipPath>
      </defs>
      <image href="/pets/scholar/wave.png" width="192" height="208" mask={`url(#${id}-body)`} onLoad={() => setReady(true)} onError={() => setFailed(true)} />
      <g className="welcome-wave-hand" key={wave}><g clipPath={`url(#${id}-hand)`}><image href="/pets/scholar/wave.png" width="192" height="208" /></g></g>
    </svg>}
  </button>;
}

export default function AppWelcome({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) {
  return <main className="study-app app-welcome" aria-labelledby="welcome-title">
    <header className="app-welcome-brand"><span className="wordmark">past<span>q</span></span></header>
    <div className="app-welcome-greeting"><ScholarGreeting /><h1 id="welcome-title">Hi, I’m Scholar.</h1></div>
    <div className="app-welcome-actions"><button type="button" className="study-primary" onClick={onSignup}>Create account</button><button type="button" className="text-button" onClick={onLogin}>Sign in</button></div>
  </main>;
}
