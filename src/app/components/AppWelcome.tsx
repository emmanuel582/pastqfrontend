import ScholarGreeting from './ScholarGreeting';

export default function AppWelcome({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) {
  return <main className="study-app app-welcome" aria-labelledby="welcome-title">
    <header className="app-welcome-brand"><span className="wordmark">past<span>q</span></span></header>
    <h1 className="sr-only" id="welcome-title">Welcome to PastQ</h1>
    <div className="app-welcome-greeting"><div className="welcome-scene"><ScholarGreeting /></div></div>
    <div className="app-welcome-actions"><button type="button" className="study-primary" onClick={onSignup}>Create account</button><button type="button" className="text-button" onClick={onLogin}>Sign in</button></div>
  </main>;
}
