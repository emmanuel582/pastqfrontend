import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, ChevronRight, Compass, GraduationCap, KeyRound, Search, X } from 'lucide-react';
import ContentSkeleton from '../ContentSkeleton';
import ReadyImage from '../ReadyImage';
import { getDiscover, joinPrivate, joinPublic, type DiscoverData, type StudySession } from '../../../services/discover';

function SessionLogo({ logo }: { logo: string | null }) {
  const [failed, setFailed] = useState(false);
  return <span className="session-logo">{logo && !failed ? <ReadyImage src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <GraduationCap size={25} strokeWidth={1.5} />}</span>;
}
export default function DiscoverScreen({ ownerId }: { ownerId: string }) {
  const [data, setData] = useState<DiscoverData>({ sessions: [], joined: [] }), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [filter, setFilter] = useState('all'), [search, setSearch] = useState(''), [showCode, setShowCode] = useState(false), [code, setCode] = useState('');
  const [selected, setSelected] = useState<StudySession | null>(null), [busy, setBusy] = useState(false), [joinError, setJoinError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null), revision = useRef(0);
  async function load() {
    const request = ++revision.current; setLoading(true); setError('');
    try { const value = await getDiscover(ownerId); if (request === revision.current) setData(value); }
    catch (err) { if (request === revision.current) setError(err instanceof Error ? err.message : 'Sessions could not load.'); }
    finally { if (request === revision.current) setLoading(false); }
  }
  useEffect(() => { void load(); return () => { revision.current++; }; }, [ownerId]);
  useEffect(() => { if (selected && !dialog.current?.open) dialog.current?.showModal(); if (!selected && dialog.current?.open) dialog.current?.close(); }, [selected]);
  const rows = (filter === 'joined' ? data.joined : data.sessions).filter(item => (filter === 'all' || filter === 'joined' || item.kind === filter) && `${item.title} ${item.tag || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  async function join(event?: FormEvent) {
    event?.preventDefault(); if (busy) return; setBusy(true); setJoinError('');
    try {
      const { session } = showCode && !selected ? await joinPrivate(ownerId, code) : await joinPublic(ownerId, selected!.id);
      setData(previous => ({ sessions: previous.sessions.map(item => item.id === session.id ? session : item), joined: [session, ...previous.joined.filter(item => item.id !== session.id)] }));
      setShowCode(false); setCode(''); setSelected(session);
    } catch (err) { setJoinError(err instanceof Error ? err.message : 'Could not join. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="study-app discover-screen"><header className="study-topbar"><span className="wordmark">past<span>q</span></span><button className="text-button discover-code-button" onClick={() => { setShowCode(value => !value); setJoinError(''); }} aria-expanded={showCode}><KeyRound size={17} />Join with code</button></header>
    <div className="library-content"><div className="library-intro"><h1>Discover</h1><label className="library-search"><Search size={19} /><input aria-label="Search sessions" placeholder="Find a tutorial or exam session" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      {showCode && <form className="discover-code-form" onSubmit={event => void join(event)}><label htmlFor="session-code">Private session code</label><div><input id="session-code" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="Code from your tutor" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={24} required /><button className="study-primary" disabled={busy || !code.trim()}>{busy ? 'Joining…' : 'Join'}<ArrowRight size={16} /></button></div>{joinError && <p role="alert">{joinError}</p>}</form>}
      <nav className="library-tabs discover-filters" aria-label="Session types">{[['all', 'All'], ['tutorial', 'Tutorials'], ['exam', 'Exams'], ['joined', 'Joined']].map(([id, title]) => <button key={id} className={filter === id ? 'active' : ''} aria-current={filter === id ? 'page' : undefined} onClick={() => setFilter(id)}>{title}</button>)}</nav>
      {error && <div className="discover-error" role="alert"><p>{error}</p><button className="text-button" onClick={() => void load()}>Try again</button></div>}
      {loading && !rows.length ? <ContentSkeleton kind="sessions" label="Loading sessions" /> : rows.length ? <div className="discover-list">{rows.map(item => <button className="discover-row" key={item.id} onClick={() => { setSelected(item); setJoinError(''); }}><SessionLogo key={item.logo} logo={item.logo} /><span className="discover-row-copy"><strong>{item.title}</strong><span><span className="session-tag">{item.kind === 'exam' ? 'Exam' : 'Tutorial'}</span>{item.tag && <span className="session-subject">{item.tag}</span>}</span></span>{item.joined && <Check size={16} aria-label="Joined" />}<ChevronRight size={18} /></button>)}</div> : !error && <div className="discover-empty"><Compass size={38} strokeWidth={1.2} /><h2>{search ? 'No matching sessions' : filter === 'joined' ? 'Your next session starts here.' : 'A little company for your preparation.'}</h2><p>{search ? 'Try another name or subject.' : filter === 'joined' ? 'Join a public session or use your tutor’s code.' : 'Public tutorials and exam sessions will appear here.'}</p>{filter !== 'joined' && !search && <button className="text-button" onClick={() => setShowCode(true)}>Have a code?<ArrowRight size={16} /></button>}</div>}
    </div>
    <dialog ref={dialog} aria-labelledby="session-dialog-title" className="session-dialog" onClose={() => { setSelected(null); setJoinError(''); }} onClick={event => { if (event.target === event.currentTarget && !busy) dialog.current?.close(); }} onCancel={event => { if (busy) event.preventDefault(); }}>
      {selected && <div className="session-dialog-content"><button className="icon-button session-dialog-close" aria-label="Close session" disabled={busy} onClick={() => dialog.current?.close()}><X size={19} /></button><SessionLogo key={selected.id} logo={selected.logo} /><span className="session-tag">{selected.kind === 'exam' ? 'Exam' : 'Tutorial'}{selected.visibility === 'private' ? ' · Private' : ''}</span><h2 id="session-dialog-title">{selected.title}</h2>{selected.tag && <p>{selected.tag}</p>}{selected.startsAt && <time dateTime={selected.startsAt}>{new Date(selected.startsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>}{selected.status === 'ended' ? <p>This session has ended.</p> : selected.joined ? <div className="session-joined" role="status"><Check size={19} /><strong>You’re in.</strong><p>Waiting for your tutor.</p></div> : <button className="study-primary" disabled={busy} onClick={() => void join()}>{busy ? 'Joining…' : 'Join session'}<ArrowRight size={16} /></button>}{joinError && <p className="discover-error" role="alert">{joinError}</p>}</div>}
    </dialog>
  </main>;
}
