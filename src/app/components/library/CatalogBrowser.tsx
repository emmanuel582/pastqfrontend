import { useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Building2, GraduationCap, Landmark, ShieldCheck, Download } from 'lucide-react';
import type { CatalogExamType, CatalogManufacturer, CatalogUniversity, LibraryCatalog } from '../../../services/libraryService';
import ContentSkeleton from '../ContentSkeleton';
import type { DownloadScope } from './DownloadChoiceDialog';
import ExamArtwork from '../ExamArtwork';
import { StudyArt } from './StudyArt';
export { StudyArt } from './StudyArt';

type Filter = 'all' | 'institution' | 'exam_board' | 'professional_body';
interface Props { catalog: LibraryCatalog; search?: string; onSelectManufacturer: (material: CatalogManufacturer, exam: CatalogExamType, organization: CatalogUniversity) => void; onDownloadMaterials?: (scope: DownloadScope) => void; onFlatBrowse?: () => void; status?: 'loading' | 'ready' | 'error'; onRetry?: () => void }
function category(type?: string): Filter { return ['university', 'polytechnic', 'college', 'school'].includes(type || '') ? 'institution' : type === 'exam_board' ? 'exam_board' : type === 'professional_body' ? 'professional_body' : 'all'; }

export function CatalogBrowser({ catalog, search = '', onSelectManufacturer, onDownloadMaterials, onFlatBrowse, status = 'ready', onRetry }: Props) {
  const id = useId();
  function download(title:string,materials:CatalogManufacturer[]){const ids=[...new Set(materials.map(material=>material.bundleId).filter(Boolean))];if(ids.length)onDownloadMaterials?.({title,ids});}
  function downloadButton(title:string,materials:CatalogManufacturer[],label=`Download ${title}`){return onDownloadMaterials&&materials.length>0?<button type="button" className="icon-button catalog-download" aria-label={label} onClick={()=>download(title,materials)}><Download size={19}/></button>:null;}
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
    <div className="category-header"><button id={`${id}-${item.id}-toggle`} className={`category-tile ${item.open ? 'selected' : ''}`} aria-expanded={item.open} aria-controls={`${id}-${item.id}-panel`} onClick={() => { setChoice({ query: needle, category: item.open ? null : item.id }); setStream('all'); }}><StudyArt type={item.id} /><span className="category-label"><strong>{item.title}</strong></span>{item.open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button></div>
    <div id={`${id}-${item.id}-panel`} className="category-panel" role="region" aria-labelledby={`${id}-${item.id}-toggle`} hidden={!item.open}>{item.open && <>
      <div className="catalog-heading"><label className="track-select"><span className="sr-only">Filter by study track</span><select value={stream} onChange={event => setStream(event.target.value)}><option value="all">All tracks</option>{['science', 'arts', 'commercial', 'general'].map(track => <option key={track} value={track}>{track[0].toUpperCase() + track.slice(1)}</option>)}</select></label></div>
      {item.rows.map(org => {
        const open = expanded.has(org.id) || !!needle;
        const Icon = org.type === 'exam_board' ? Landmark : org.type === 'professional_body' ? ShieldCheck : org.type === 'university' ? GraduationCap : Building2;
        return <section className="catalog-organization" key={org.id}>
          <div className="organization-heading"><button className="organization-toggle" aria-expanded={open} onClick={() => setExpanded(previous => { const next = new Set(previous); next.has(org.id) ? next.delete(org.id) : next.add(org.id); return next; })}><ExamArtwork identity={org} fallback={<Icon size={24} strokeWidth={1.5} />} /><span><strong>{org.name}</strong><small>{org.examTypes.length} collection{org.examTypes.length === 1 ? '' : 's'}</small></span>{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>{downloadButton(org.name,org.examTypes.flatMap(exam=>exam.materials))}</div>
          {open && <div className="organization-materials">{org.examTypes.map(exam => <div key={exam.id}><div className="catalog-exam-heading"><h3>{exam.name}</h3>{downloadButton(exam.name,exam.materials,`Download ${exam.name} from ${org.name}`)}</div>{exam.materials.map(material => <MaterialRow key={material.bundleId || material.id} material={material} examName={exam.name} onClick={() => onSelectManufacturer(material, exam, org)} onDownload={onDownloadMaterials?()=>download(material.title||material.name,[material]):undefined} />)}</div>)}</div>}
        </section>;
      })}
      {item.papers.map(material => <MaterialRow key={material.bundleId || material.id} material={material} onDownload={onDownloadMaterials?()=>download(material.title||material.name,[material]):undefined} onClick={() => onSelectManufacturer(material, { id: 'ungrouped', slug: 'ungrouped', name: 'Other materials', manufacturers: [] }, { id: 'ungrouped', slug: 'ungrouped', name: 'Other materials', type: 'other', examTypes: [] })} />)}
      {!item.rows.length && !item.papers.length && empty(!!raw.length)}
    </>}</div>
  </section>)}</div>{!visible.length && !ungrouped.length && !sections.some(section => section.open) && empty()}</div>;
}
function MaterialRow({ material, examName, onClick, onDownload }: { material: CatalogManufacturer; examName?: string; onClick: () => void; onDownload?:()=>void }) {
  const [opening, setOpening] = useState(false);
  const year = material.yearMin && material.yearMax ? material.yearMin === material.yearMax ? material.yearMin : `${material.yearMin}–${material.yearMax}` : null;
  return <div className="material-row catalog-material-row"><button className="catalog-material-open" aria-busy={opening} disabled={opening} onClick={async () => { if (opening) return; setOpening(true); try { await onClick(); } finally { setOpening(false); } }}><ExamArtwork identity={examName || material} /><span><strong>{material.title || material.name}</strong><small>{opening ? 'Preparing your download…' : [`${material.questionCount || 0} questions`, year].filter(Boolean).join(' · ')}</small></span><ChevronRight size={18} /></button>{onDownload&&<button className="icon-button catalog-download" aria-label={`Download ${material.title||material.name}`} disabled={opening} onClick={onDownload}><Download size={19}/></button>}</div>;
}
