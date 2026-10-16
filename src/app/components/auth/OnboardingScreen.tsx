import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Compass, GraduationCap, Search } from 'lucide-react';
import catalog from '../../../data/onboarding-catalog.json';
import { completeOnboarding, type StudyFocus, type StudyPreferences } from '../../../services/onboarding';
import { AuthShell } from './AuthShell';

type Option = { id: string; name: string; detail: string; aliases: string[]; university?: boolean };
interface Props { name: string; undergraduate: boolean | null; onComplete: (preferences: StudyPreferences) => void }

export default function OnboardingScreen({ name, undergraduate: initialUndergraduate, onComplete }: Props) {
  const [undergraduate, setUndergraduate] = useState(initialUndergraduate);
  const [kind, setKind] = useState<'school' | 'exam'>('school');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<StudyFocus | null>(null);
  const [limit, setLimit] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  useEffect(() => { if (initialUndergraduate !== null) setUndergraduate(current => current ?? initialUndergraduate); }, [initialUndergraduate]);
  const firstName = name.trim().split(/\s+/)[0] || 'there';
  const options = useMemo<Option[]>(() => kind === 'exam' ? catalog.exams.map(e => ({ id: e.id, name: e.n, detail: e.b, aliases: e.a })) : catalog.schools.filter(s => undergraduate !== true || s.t === 'university').map(s => ({ id: s.id, name: s.n, detail: s.s, aliases: s.a, university: s.t === 'university' })), [kind, undergraduate]);
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const preferred = ['University of Lagos', 'University of Ibadan', 'Ahmadu Bello University', 'University of Nigeria', 'University of Port'];
    const rank = (option: Option) => needle ? (option.aliases.some(value => value.toLocaleLowerCase() === needle) ? -1 : 0) : preferred.findIndex(value => option.name.startsWith(value));
    return options.filter(o => !needle || [o.name, ...o.aliases].some(value => value.toLocaleLowerCase().includes(needle))).sort((a, b) => { const aRank = rank(a), bRank = rank(b); return needle ? aRank - bRank : (aRank < 0 ? 100 : aRank) - (bRank < 0 ? 100 : bRank); });
  }, [query, options]);
  async function finish(focus: StudyFocus | null) {
    if (saving.current || undergraduate === null) return;
    saving.current = true; setBusy(true); setError('');
    try { onComplete(await completeOnboarding(undergraduate, focus)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t save your choice. Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  }
  function changeKind(next: 'school' | 'exam') { setKind(next); setSelected(null); setQuery(''); setLimit(5); setError(''); }
  const title = undergraduate === null ? `Welcome, ${firstName}.` : undergraduate ? 'Pick your university.' : 'Make it yours.';
  return <AuthShell title={title} greeting={undergraduate === null ? 'Let’s make this yours.' : `Let’s find your place, ${firstName}.`} mascotState={busy ? 'waiting' : 'encourage'} onBack={undergraduate === null || busy ? undefined : () => { setUndergraduate(null); changeKind('school'); }}>
    {undergraduate === null ? <div className="auth-paths" role="group" aria-label="Choose your study path"><button type="button" onClick={() => setUndergraduate(true)}><span className="auth-path-icon"><GraduationCap size={24} /></span><strong>Undergraduate</strong><ArrowRight size={18} /></button><button type="button" onClick={() => setUndergraduate(false)}><span className="auth-path-icon"><Compass size={24} /></span><strong>Other learner</strong><ArrowRight size={18} /></button></div> : <>
      {!undergraduate && <div className="auth-picker-tabs" role="group" aria-label="Choose a school or exam">{(['school', 'exam'] as const).map(value => <button type="button" key={value} aria-pressed={kind === value} onClick={() => changeKind(value)} disabled={busy}>{value === 'school' ? 'School' : 'Exam'}</button>)}</div>}
      <label className="auth-search"><Search size={18} /><input aria-label={undergraduate ? 'Search universities' : `Search ${kind === 'school' ? 'schools' : 'exams'}`} placeholder={undergraduate ? 'Search university or abbreviation' : `Search ${kind === 'school' ? 'school' : 'exam'}`} value={query} onChange={event => { setQuery(event.target.value); setLimit(5); }} disabled={busy} /></label>
      <div className="auth-options" role="group" aria-label={undergraduate ? 'Universities' : kind === 'school' ? 'Schools' : 'Exams'}>
        {matches.slice(0, limit).map(option => <button type="button" key={option.id} className={`auth-option ${selected?.id === option.id ? 'selected' : ''}`} aria-pressed={selected?.id === option.id} disabled={busy} onClick={() => { setSelected({ kind, id: option.id, name: option.name, aliases: option.aliases }); setError(''); }}><span><strong>{option.name}</strong>{option.detail && <small>{option.detail}</small>}</span><span className="auth-selection">{selected?.id === option.id ? <Check size={16} /> : <GraduationCap size={17} />}</span></button>)}
        {!matches.length && <div className="auth-no-results"><p>No match yet.</p>{query.trim() && <button type="button" className="text-button" disabled={busy} onClick={() => setSelected({ kind, id: `custom:${kind}:${query.trim().toLowerCase()}`, name: query.trim() })}>Use “{query.trim()}”</button>}</div>}
      </div>
      {matches.length > limit && <button type="button" className="auth-more" disabled={busy} onClick={() => setLimit(value => value + 8)}>Show more</button>}
      {selected && !matches.some(option => option.id === selected.id) && <p className="auth-picked" role="status">{selected.name}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="button" className="study-primary auth-submit" disabled={busy || !selected} onClick={() => void finish(selected)}>{busy ? 'Saving…' : 'Let’s go'}{!busy && <ArrowRight size={17} />}</button>
      {!undergraduate && <button type="button" className="auth-explore" disabled={busy} onClick={() => void finish(null)}>Explore without choosing</button>}
    </>}
  </AuthShell>;
}
