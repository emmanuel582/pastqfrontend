import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Download, Pause, ChevronDown, ChevronRight } from 'lucide-react';
import { downloadManifest, downloadSelected, savedDownloadSelection, formatBytes, type DownloadManifest } from '../../../services/downloads';
import { saveBundle, getOfflineBundle } from '../../../services/libraryService';
import ContentSkeleton from '../ContentSkeleton';
import type { DownloadMode } from './DownloadChoiceDialog';

const questionLabel=(count:number)=>`${count.toLocaleString()} question${count===1?'':'s'}`;

type Entry = { manifest: DownloadManifest; selected: string[] };
type Props = { id: string; ids?: string[]; title?: string; mode?: DownloadMode; onBack: () => void; onSaved: (bundle: any, count: number) => void };

export default function DownloadScreen({ id, ids, title, mode = 'select', onBack, onSaved }: Props) {
  const bundleIds = useMemo(() => [...new Set([id, ...(ids || [])])], [id, ids]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState([0, 0]), [currentTitle, setCurrentTitle] = useState('');
  const [detail, setDetail] = useState<{ id: string; subject: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(bundleIds.length === 1 ? id : null);
  const [showSelection, setShowSelection] = useState(mode !== 'all'), [reload, setReload] = useState(0);
  const controller = useRef<AbortController | null>(null), running = useRef(false), automatic = useRef(false);
  const completed = useRef(new Set<string>()), scroll = useRef<HTMLDivElement>(null), positions = useRef<Record<string, number>>({});
  const ready = bundleIds.every(key => entries[key]);

  useEffect(() => {
    const abort = new AbortController(); let next = 0;
    setError(''); setEntries({});
    async function load() {
      while (next < bundleIds.length && !abort.signal.aborted) {
        const key = bundleIds[next++];
        const [manifest, saved] = await Promise.all([downloadManifest(key, abort.signal), getOfflineBundle(key)]);
        if (abort.signal.aborted) return;
        const selected = mode === 'all' ? manifest.parts.map(part => part.hash) : saved ? savedDownloadSelection(manifest, saved) : [];
        setEntries(previous => ({ ...previous, [key]: { manifest, selected } }));
      }
    }
    Promise.all(Array.from({ length: Math.min(3, bundleIds.length) }, load)).catch(err => {
      if (!abort.signal.aborted) setError(err instanceof Error ? err.message : 'Download details could not load.');
    });
    return () => { abort.abort(); controller.current?.abort(); };
  }, [bundleIds, mode, reload]);

  const jobs = bundleIds.flatMap(key => entries[key]?.selected.length ? [{ id: key, ...entries[key] }] : []);
  const selectedParts = jobs.flatMap(entry => entry.manifest.parts.filter(part => entry.selected.includes(part.hash)));
  const bytes = selectedParts.reduce((sum, part) => sum + part.bytes, 0), count = selectedParts.reduce((sum, part) => sum + part.count, 0);

  async function start() {
    if (!ready || !jobs.length || running.current) return;
    running.current = true; setBusy(true); setError(''); setPaused(false);
    const abort = new AbortController(); controller.current = abort;
    let done = 0, last: any;
    setProgress([0, bytes]);
    try {
      for (const job of jobs) {
        const size = job.manifest.parts.filter(part => job.selected.includes(part.hash)).reduce((sum, part) => sum + part.bytes, 0);
        setCurrentTitle(job.manifest.bundle.title || title || 'Your subjects');
        if (!completed.current.has(job.id)) {
          last = await downloadSelected(job.manifest, job.selected, saveBundle, { signal: abort.signal, onProgress: value => setProgress([done + value, bytes]) });
          completed.current.add(job.id);
        }
        done += size; setProgress([done, bytes]);
      }
      if (!abort.signal.aborted) onSaved(last, jobs.length);
    } catch (err) {
      if (abort.signal.aborted) setPaused(true);
      else setError(err instanceof Error ? err.message : 'Download failed. Tap Resume to retry.');
    } finally { running.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (mode === 'all' && ready && !automatic.current) { automatic.current = true; void start(); }
  }, [mode, ready]);

  function toggle(key: string, hashes: string[], checked: boolean) {
    completed.current.delete(key);
    setEntries(previous => {
      const entry = previous[key];
      return { ...previous, [key]: { ...entry, selected: checked ? [...new Set([...entry.selected, ...hashes])] : entry.selected.filter(hash => !hashes.includes(hash)) } };
    });
  }
  function openDetail(value: typeof detail) {
    positions.current[detail ? detail.id + ':' + detail.subject : 'subjects'] = scroll.current?.scrollTop || 0;
    setDetail(value);
  }
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = positions.current[detail ? detail.id + ':' + detail.subject : 'subjects'] || 0; }, [detail]);

  function subjects(key: string) {
    const entry = entries[key];
    return [...new Set(entry.manifest.parts.map(part => part.subject))].map(name => {
      const group = entry.manifest.parts.filter(part => part.subject === name);
      return <div className="download-subject" key={name}>
        <label className="download-checkbox"><input type="checkbox" aria-label={`Download ${name}${bundleIds.length > 1 ? ' from ' + entry.manifest.bundle.title : ''}`} disabled={busy} checked={group.every(part => entry.selected.includes(part.hash))} ref={element => { if (element) element.indeterminate = group.some(part => entry.selected.includes(part.hash)) && !group.every(part => entry.selected.includes(part.hash)); }} onChange={event => toggle(key, group.map(part => part.hash), event.target.checked)} /></label>
        <button className="archive-bookmark-open" disabled={busy} onClick={() => openDetail({ id: key, subject: name })}><span><strong>{name}</strong><small>{questionLabel(group.reduce((sum, part) => sum + part.count, 0))} · {formatBytes(group.reduce((sum, part) => sum + part.bytes, 0))}</small></span><ChevronRight size={18} /></button>
      </div>;
    });
  }

  const current = detail && entries[detail.id];
  return <main className="study-app library-screen archive-screen download-screen">
    <header className="study-topbar archive-topbar"><button className="icon-button" aria-label={detail ? 'Back to subjects' : 'Back to library'} disabled={busy} onClick={() => detail ? openDetail(null) : onBack()}><ArrowLeft size={20} /></button><h1>{detail?.subject || (showSelection ? 'Choose subjects' : 'Download')}</h1></header>
    <div className="download-scroll" ref={scroll} role="region" tabIndex={0} aria-label={detail ? `${detail.subject} papers` : 'Download subjects'}><div className="library-content archive-content download-content">
      {!showSelection ? <div className="download-all-state"><Download size={32} strokeWidth={1.5} /><h2>{title || entries[id]?.manifest.bundle.title || 'All subjects'}</h2><p role="status">{busy ? currentTitle : ready ? paused || error ? 'Download paused' : 'Preparing download…' : 'Loading download details…'}</p></div> : <>
        <h2>{detail ? current && current.manifest.bundle.title : title || entries[id]?.manifest.bundle.title || 'Your materials'}</h2>
        {detail && current ? <div>{current.manifest.parts.filter(part => part.subject === detail.subject).map(part => <label className="download-part" key={part.hash}><input type="checkbox" aria-label={`Download ${part.paper || part.year || 'Topic collection'} part ${part.part || 1}`} checked={current.selected.includes(part.hash)} disabled={busy} onChange={event => toggle(detail.id, [part.hash], event.target.checked)} /><span><strong>{part.paper || part.year || 'Topic collection'}{part.offset > 0 ? ` · Part ${part.part || Math.floor(part.offset / 100) + 1}` : ''}</strong><small>{questionLabel(part.count)} · {formatBytes(part.bytes)}</small></span></label>)}</div> : bundleIds.map(key => {
          const entry = entries[key]; if (!entry) return <ContentSkeleton kind="materials" label="Loading subjects" key={key} />;
          if (bundleIds.length === 1) return <div key={key}>{subjects(key)}</div>;
          const open = expanded === key;
          return <section className="download-collection" key={key}><div className="download-subject"><label className="download-checkbox"><input type="checkbox" aria-label={`All subjects in ${entry.manifest.bundle.title}`} disabled={busy} checked={entry.selected.length === entry.manifest.parts.length} ref={element => { if (element) element.indeterminate = !!entry.selected.length && entry.selected.length < entry.manifest.parts.length; }} onChange={event => toggle(key, entry.manifest.parts.map(part => part.hash), event.target.checked)} /></label><button className="archive-bookmark-open" aria-expanded={open} disabled={busy} onClick={() => setExpanded(open ? null : key)}><span><strong>{entry.manifest.bundle.title}</strong><small>{questionLabel(entry.manifest.totalQuestions)}</small></span>{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button></div>{open && <div className="download-collection-subjects">{subjects(key)}</div>}</section>;
        })}
      </>}
      {error && <p role="alert" className="selection-error">{error}</p>}{error && !ready && <button className="study-secondary" onClick={() => setReload(value => value + 1)}>Retry</button>}
    </div></div>
    <footer className="download-footer"><div className="download-actions">
      {busy ? <><progress value={progress[0]} max={progress[1] || 1} aria-label="Download progress" /><span role="status">{formatBytes(progress[0])} / {formatBytes(progress[1])}</span><button className="study-secondary" onClick={() => controller.current?.abort()}><Pause size={17} />Pause</button></> : <><span>{questionLabel(count)} · {formatBytes(bytes)}</span><button className="study-primary" disabled={!ready || !count} onClick={() => void start()}><Download size={17} />{paused || error ? 'Resume download' : 'Save for offline'}<Check size={16} /></button></>}
    </div></footer>
  </main>;
}
