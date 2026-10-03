import { Children, type ReactNode } from 'react';
import ScholarMascot, { type ScholarState } from './ScholarMascot';

type LoadingState = 'preparing' | 'ready' | 'waiting' | 'interrupted' | 'failed' | 'empty';
const titles: Record<LoadingState, string> = {
  preparing: 'Your next session,\ncoming together.', ready: 'All set.\nLet’s practise.',
  waiting: 'A little help,\nthen we’re ready.', interrupted: 'We’ll pick up\nwhere we left off.',
  failed: 'Let’s give it\nanother try.', empty: 'Ready for\nyour next material.',
};
export default function StudyLoading({ state = 'preparing', name, progress, message, children, compact = false }: {
  state?: LoadingState; name?: string; progress?: number | null; message?: string;
  children?: ReactNode; compact?: boolean;
}) {
  const value = progress == null || !Number.isFinite(progress) ? null : Math.max(0, Math.min(100, progress));
  const paused = ['waiting', 'interrupted', 'failed', 'empty'].includes(state);
  const hasActions = Children.toArray(children).length > 0;
  const pose: ScholarState = state === 'ready' ? 'celebrate' : state === 'failed' ? 'encourage'
    : paused ? 'waiting' : 'study';
  if (compact) return <div className="study-inline-loading" role="status" aria-live="polite">
    <ScholarMascot compact /><p>{message || 'Opening your library…'}</p>
    <div className="study-loading-track is-indeterminate" aria-hidden="true"><span /></div>
  </div>;
  return <main className="study-app study-loading" aria-busy={state === 'preparing' || state === 'interrupted'}>
    <header className="loading-header"><span className="wordmark">past<span>q</span></span></header>
    <div className="loading-layout">
      <div className="loading-illustration"><ScholarMascot state={pose} /></div>
      <div className="loading-content">
        <h1 key={state} className="loading-title" role="status" aria-live="polite">{titles[state]}</h1>
        {name && <p className="loading-material" title={name}>{name}</p>}
        {!paused && <div className="loading-progress">
          <div className="loading-progress-label"><span>{state === 'ready' ? 'Ready to practise' : 'Preparing your material'}</span>{value !== null && <span className="loading-percentage">{Math.floor(value)}<small>%</small></span>}</div>
          <div className={`study-loading-track ${value === null ? 'is-indeterminate' : ''}`} role="progressbar" aria-label="Preparing your material" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined} aria-valuetext={value === null ? 'In progress' : `${Math.floor(value)} percent`}><span style={value === null ? undefined : { width: `${value}%` }} /></div>
        </div>}
        {message && <p className="loading-message" role="status">{message}</p>}
        {hasActions && <div className="loading-actions">{children}</div>}
      </div>
    </div>
  </main>;
}
