import { useId, useState } from 'react';

/** The greeting loops at the wrist while the face and body stay anchored. */
function ScholarGreeting() {
  const id = useId().replace(/:/g, '');
  const [ready, setReady] = useState(false);
  const [wave, setWave] = useState(0);
  const [failed, setFailed] = useState(false);
  const hand = 'M55 25H80V54L73 62H55Z';
  return <button type="button" className="welcome-scholar" aria-label="Wave with Scholar" onClick={() => setWave(value => value + 1)}>
    {failed ? <span className="welcome-scholar-fallback" aria-hidden="true">past<span>q</span></span> : <svg viewBox="42 0 108 208" aria-hidden="true" data-ready={ready}>
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
    <div className="app-welcome-greeting"><div className="welcome-scene"><ScholarGreeting /><div className="welcome-speech"><h1 id="welcome-title">Hi, I’m<br />Scholar.</h1><svg className="welcome-speech-tail" viewBox="0 0 28 24" aria-hidden="true"><path d="M28 0C18 5 11 10 0 12C11 19 21 22 28 24Z" /></svg></div></div></div>
    <div className="app-welcome-actions"><button type="button" className="study-primary" onClick={onSignup}>Create account</button><button type="button" className="text-button" onClick={onLogin}>Sign in</button></div>
  </main>;
}
