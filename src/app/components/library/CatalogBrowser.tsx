import { useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Building2, GraduationCap, Landmark, ShieldCheck } from 'lucide-react';
import type { CatalogExamType, CatalogManufacturer, CatalogUniversity, LibraryCatalog } from '../../../services/libraryService';
import ContentSkeleton from '../ContentSkeleton';
import ExamArtwork from '../ExamArtwork';

type Filter = 'all' | 'institution' | 'exam_board' | 'professional_body';
interface Props { catalog: LibraryCatalog; search?: string; onSelectManufacturer: (material: CatalogManufacturer, exam: CatalogExamType, organization: CatalogUniversity) => void; onFlatBrowse?: () => void; status?: 'loading' | 'ready' | 'error'; onRetry?: () => void }
function category(type?: string): Filter { return ['university', 'polytechnic', 'college', 'school'].includes(type || '') ? 'institution' : type === 'exam_board' ? 'exam_board' : type === 'professional_body' ? 'professional_body' : 'all'; }

export function StudyArt({ type = 'institution' }: { type?: string }) {
  return <svg viewBox="0 0 180 120" fill="none" className="study-art" aria-hidden="true">
    {type === 'institution' ? <><path d="M20 101H159M31 96V45L89 18l58 27v51M30 45h118M37 91h104M46 53v30m22-30v30m22-30v30m22-30v30m22-30v30" stroke="currentColor" strokeWidth="2" /><path d="M59 42h61L89 27z" fill="currentColor" opacity=".1" /><circle cx="89" cy="35" r="3" fill="var(--study-accent)" /><path d="M25 108h130M43 88h13m9 0h13m9 0h13m9 0h13m9 0h13" stroke="currentColor" opacity=".3" /></> : type === 'exam_board' ? <><g transform="rotate(-10 85 60)"><path d="M48 17h72v90H48z" fill="currentColor" opacity=".06" /><path d="M48 17h72v90H48zM62 34h44M62 42h27M76 62h30M76 78h30M76 94h19" stroke="currentColor" strokeWidth="1.5" /><path d="m58 60 4 4 7-9m-11 22 4 4 7-9m-11 22 4 4 7-9" stroke="var(--study-accent)" strokeWidth="2" /></g><path d="m126 86 15-57 6 2-15 57-6 7z" stroke="currentColor" strokeWidth="1.5" /></> : <><path d="M43 81V48c16-8 30-8 47 0 17-8 31-8 47 0v33c-17-7-31-7-47 0-17-7-31-7-47 0zM90 48v33M43 88h94" stroke="currentColor" strokeWidth="1.5" /><circle cx="90" cy="26" r="13" stroke="var(--study-accent)" strokeWidth="1.5" /><path d="m84 26 4 4 9-10M74 15l-7-6m39 6 7-6M90 7V1" stroke="var(--study-accent)" strokeWidth="1.5" /><path d="M56 56h23m-23 8h23m23-8h23m-23 8h23" stroke="currentColor" opacity=".3" /></>}
  </svg>;
}

export function CatalogBrowser({ catalog, search = '', onSelectManufacturer, onFlatBrowse, status = 'ready', onRetry }: Props) {
  const id = useId();
  const raw = catalog.organizations?.length ? catalog.organizations : catalog.universities || [];
  const organizations = raw.filter(org => !['general', 'unknown', 'misc', 'miscellaneous', 'unclassified'].includes(org.name.trim().toLowerCase()));
  const [choice, setChoice] = useState<{ query: string; category: Filter | null }>({ query: '', category: null });
  const [stream, setStream] = useState('all');
  const [expanded, setExpanded] = useState(new Set<string>());
  const needle = search.trim().toLowerCase();
  const matches = (material: CatalogManufacturer, names: string[] = []) => (stream === 'all' || material.streams?.includes(stream)) && (!needle || [...names, material.name, material.title, ...(material.subjects || [])].some(value => value?.toLowerCase().includes(needle)));
  const visible = useMemo(() => organizations.map(org => ({ ...org, examTypes: org.examTypes.map(exam => ({ ...exam, materials: (exam.materials || exam.manufacturers || []).filter(m => matches(m, [org.name, org.shortName || '', exam.name])) })).filter(exam => exam.materials.length > 0) })).filter(org => org.examTypes.length), [catalog, stream, needle]);
  const ungrouped = (catalog.ungrouped || []).filter(m => matches(m));
  if (status === 'loading' && !raw.length && !(catalog.ungrouped || []).length) return <ContentSkeleton kind="catalog" label="Loading library" />;
  const empty = (filtered = false) => <div className="library-empty"><BookOpen size={28} strokeWidth={1.3} /><h3>{status === 'error' ? 'Your library couldn’t load.' : needle || stream !== 'all' || filtered ? 'No matching materials' : 'No materials yet.'}</h3>{status === 'error' && <p>Check your connection and try again.</p>}{status === 'error' && onRetry ? <button className="text-button" onClick={onRetry}>Try again<ChevronRight size={16} /></button> : status === 'ready' && onFlatBrowse ? <button className="text-button" onClick={onFlatBrowse}>Browse all materials<ChevronRight size={16} /></button> : null}</div>;
  if (status === 'error' && !raw.length && !(catalog.ungrouped || []).length) return <div className="catalog-browser">{empty()}</div>;
  const categories: { id: Filter; title: string }[] = [{ id: 'institution', title: 'Schools & universities' }, { id: 'exam_board', title: 'Tests & qualifications' }, { id: 'professional_body', title: 'Professional study' }];
  if (organizations.some(org => category(org.type) === 'all') || catalog.ungrouped?.length) categories.push({ id: 'all', title: 'Other materials' });
  const sections = categories.map(item => {
    const rows = visible.filter(org => category(org.type) === item.id);
    const papers = item.id === 'all' ? ungrouped : [];
    // A new search reveals matching categories; subsequent taps remain collapsible.
    const open = choice.query === needle ? choice.category === item.id : !!needle && !!(rows.length || papers.length);
    return { ...item, rows, papers, open };
  });
  return <div className="catalog-browser"><div className="category-gallery" role="group" aria-label="Browse materials by category">{sections.map(item => <section key={item.id} className={`category-group${item.open ? ' is-open' : ''}`}>
    <button id={`${id}-${item.id}-toggle`} className={`category-tile ${item.open ? 'selected' : ''}`} aria-expanded={item.open} aria-controls={`${id}-${item.id}-panel`} onClick={() => { setChoice({ query: needle, category: item.open ? null : item.id }); setStream('all'); }}><StudyArt type={item.id} /><span className="category-label"><strong>{item.title}</strong></span>{item.open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button>
    <div id={`${id}-${item.id}-panel`} className="category-panel" role="region" aria-labelledby={`${id}-${item.id}-toggle`} hidden={!item.open}>{item.open && <>
      <div className="catalog-heading"><label className="track-select"><span className="sr-only">Filter by study track</span><select value={stream} onChange={event => setStream(event.target.value)}><option value="all">All tracks</option>{['science', 'arts', 'commercial', 'general'].map(track => <option key={track} value={track}>{track[0].toUpperCase() + track.slice(1)}</option>)}</select></label></div>
      {item.rows.map(org => { const open = expanded.has(org.id) || !!needle; const Icon = org.type === 'exam_board' ? Landmark : org.type === 'professional_body' ? ShieldCheck : org.type === 'university' ? GraduationCap : Building2; return <section className="catalog-organization" key={org.id}><button className="organization-toggle" aria-expanded={open} onClick={() => setExpanded(prev => { const next = new Set(prev); next.has(org.id) ? next.delete(org.id) : next.add(org.id); return next; })}><ExamArtwork identity={org} fallback={<Icon size={24} strokeWidth={1.5} />} /><span><strong>{org.name}</strong><small>{org.examTypes.length} collection{org.examTypes.length === 1 ? '' : 's'}</small></span>{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>{open && <div className="organization-materials">{org.examTypes.map(exam => <div key={exam.id}><h3>{exam.name}</h3>{exam.materials.map(material => <MaterialRow key={material.bundleId || material.id} material={material} examName={exam.name} onClick={() => onSelectManufacturer(material, exam, org)} />)}</div>)}</div>}</section>; })}
      {item.papers.map(material => <MaterialRow key={material.bundleId || material.id} material={material} onClick={() => onSelectManufacturer(material, { id: 'ungrouped', slug: 'ungrouped', name: 'Other materials', manufacturers: [] }, { id: 'ungrouped', slug: 'ungrouped', name: 'Other materials', type: 'other', examTypes: [] })} />)}
      {!item.rows.length && !item.papers.length && empty(!!raw.length)}
    </>}</div>
  </section>)}</div>{!visible.length && !ungrouped.length && !sections.some(section => section.open) && empty()}</div>;
}
function MaterialRow({ material, examName, onClick }: { material: CatalogManufacturer; examName?: string; onClick: () => void }) {
  const [opening, setOpening] = useState(false);
  const year = material.yearMin && material.yearMax ? material.yearMin === material.yearMax ? material.yearMin : `${material.yearMin}–${material.yearMax}` : null;
  return <button className="material-row" aria-busy={opening} disabled={opening} onClick={async () => { if (opening) return; setOpening(true); try { await onClick(); } finally { setOpening(false); } }}><ExamArtwork identity={examName || material} /><span><strong>{material.title || material.name}</strong><small>{opening ? 'Preparing your download…' : [`${material.questionCount || 0} questions`, year].filter(Boolean).join(' · ')}</small></span><ChevronRight size={18} /></button>;
}
