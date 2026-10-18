import { useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Search, Trash2 } from 'lucide-react';
import type { SavedBookmark } from '../../../services/practiceArchive';

export default function SavedQuestionsScreen({ bookmarks, onOpen, onRemove, onBack }: {
  bookmarks: SavedBookmark[]; onOpen: (bookmark: SavedBookmark) => void; onRemove: (key: string) => Promise<void>; onBack: () => void;
}) {
  const [search, setSearch] = useState(''), [busy, setBusy] = useState<string | null>(null);
  const filtered = bookmarks.filter(row => `${row.question.subject} ${row.question.year || ''} ${row.question.question}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <main className="study-app library-screen archive-screen archive-bookmarks-screen"><header className="study-topbar archive-topbar"><button className="icon-button" aria-label="Back to Preferences" onClick={onBack}><ArrowLeft size={20} /></button><h1>Saved questions</h1></header><div className="library-content archive-content">
    {bookmarks.length > 0 && <label className="library-search archive-search"><Search size={18} /><input aria-label="Find a saved question" placeholder="Subject, year or question" value={search} onChange={event => setSearch(event.target.value)} /></label>}
    <div className="archive-bookmarks">{filtered.map(row => <div className="archive-bookmark" key={row.key}><button className="archive-bookmark-open" onClick={() => onOpen(row)}><span><small>{row.question.subject}{row.question.year ? ` · ${row.question.year}` : ''}</small><strong>{row.question.question.replace(/\[Illustration\]/gi, '').trim() || 'View diagram'}</strong></span><ArrowRight size={18} /></button><button className="icon-button" disabled={busy === row.key} aria-label={`Remove saved ${row.question.subject} question`} onClick={async () => { setBusy(row.key); try { await onRemove(row.key); } finally { setBusy(null); } }}><Trash2 size={17} /></button></div>)}</div>
    {!filtered.length && <div className="library-empty"><Bookmark size={30} strokeWidth={1.3} /><h3>{bookmarks.length ? 'No matching questions.' : 'Save a question to revisit it.'}</h3></div>}
  </div></main>;
}
