import type { ReactNode } from 'react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import ScholarMascot, { type ScholarState } from '../ScholarMascot';
import { applyTheme, THEME_STORAGE_KEY } from '../../../utils/theme';

export function AuthShell({ title, greeting, mascotState = 'idle', onBack, children }: { title: string; greeting: string; mascotState?: ScholarState; onBack?: () => void; children: ReactNode }) {
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: next }));
  }
  return <main className="study-app auth-screen">
    <header className="auth-topbar">
      <span className="wordmark">past<span>q</span></span>
      <button type="button" className="auth-theme" aria-label="Switch appearance" onClick={toggleTheme}><Sun className="auth-light-icon" size={18} /><Moon className="auth-dark-icon" size={18} /></button>
    </header>
    <div className="auth-layout">
      <aside className="auth-scholar" aria-label="Scholar, your study buddy">
        <span className="auth-scholar-greeting">{greeting}</span>
        <ScholarMascot state={mascotState} />
      </aside>
      <section className="auth-form-area" aria-labelledby="auth-title">
        <header className="auth-heading">{onBack && <button type="button" className="auth-back" onClick={onBack} aria-label="Go back"><ArrowLeft size={18} /></button>}<h1 id="auth-title">{title}</h1></header>
        {children}
      </section>
    </div>
  </main>;
}
