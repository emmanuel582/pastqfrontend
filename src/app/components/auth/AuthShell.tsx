import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import ScholarMascot, { type ScholarState } from '../ScholarMascot';

export function AuthShell({ title, greeting, mascotState = 'idle', onBack, children }: { title: string; greeting?: string; mascotState?: ScholarState; onBack?: () => void; children: ReactNode }) {
  return <main className="study-app auth-screen">
    <header className="auth-topbar">
      <span className="wordmark">past<span>q</span></span>
    </header>
    <div className="auth-layout">
      <aside className={`auth-scholar ${greeting ? 'auth-scholar-hello' : ''}`} aria-label="Scholar, your study buddy">
        {greeting ? <div className="auth-greeting-scene"><div className="scholar-speech"><span>{greeting}</span><span className="scholar-speech-dots" aria-hidden="true"><i /><i /><i /></span></div><img className="scholar-account-pose" src="/pets/scholar/67.webp" alt="" loading="eager" /></div> : <ScholarMascot state={mascotState} />}
      </aside>
      <section className="auth-form-area" aria-labelledby="auth-title">
        <header className="auth-heading">{onBack && <button type="button" className="auth-back" onClick={onBack} aria-label="Go back"><ArrowLeft size={18} /></button>}<h1 id="auth-title">{title}</h1></header>
        {children}
      </section>
    </div>
  </main>;
}
