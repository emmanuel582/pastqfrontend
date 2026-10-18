import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Download, Plus, Search, Upload } from 'lucide-react';
import { StudyLibrary } from './StudyLibrary';
import ContentSkeleton from '../ContentSkeleton';
import ExamArtwork from '../ExamArtwork';
import { publisherName, savedEnvironments, type Preparation } from '../../../services/preparation';

type Props = Parameters<typeof StudyLibrary>[0] & { preparation: Preparation; onPreparation: (value: Preparation) => void };
export default function PreparationLibrary({ preparation, onPreparation, ...library }: Props) {
  const [exploring, setExploring] = useState(false), [search, setSearch] = useState(library.initialSearch || '');
  const environments = useMemo(() => savedEnvironments(library.offlineLibrary), [library.offlineLibrary]);
  const active = environments.find(environment => environment.id === preparation.activeEnvironment);
  const needle = search.trim().toLowerCase();
  const matches = (material: any) => [material.title, material.name, publisherName(material), ...new Set((material.questions || []).map((question: any) => question.subject))].filter(Boolean).some(value => String(value).toLowerCase().includes(needle));
  if (preparation.enabled && library.savedReady === false) return <ContentSkeleton kind="preparation" label="Loading saved exams" fullPage />;
  if (!preparation.enabled) return <StudyLibrary {...library} />;
  if (exploring) return <div className="preparation-explore"><button className="text-button preparation-return" onClick={() => { setExploring(false); setSearch(''); }}><ArrowLeft size={17} />Your downloaded exams</button><StudyLibrary {...library} /></div>;
  const visible = environments.filter(environment => !needle || `${environment.name} ${environment.organization}`.toLowerCase().includes(needle) || environment.materials.some(matches));
  const materials = active?.materials.filter(material => !needle || matches(material)) || [];
  return <main className="study-app library-screen preparation-library">
    <header className="study-topbar">{active ? <button className="text-button" onClick={() => { onPreparation({ ...preparation, activeEnvironment: null }); setSearch(''); }}><ArrowLeft size={17} />Your exams</button> : <span className="wordmark">past<span>q</span></span>}<button className="text-button" onClick={() => setExploring(true)}>Find more<Plus size={17} /></button></header>
    <div className="library-content"><div className="preparation-heading"><span className="preparation-offline"><Download size={14} />On your device</span><h1>{active?.name || 'Your study spaces.'}</h1>{active?.organization && <p>{active.organization}</p>}</div>
      <label className="library-search preparation-search"><Search size={18} /><input aria-label={active ? 'Search saved publishers' : 'Search saved exams'} placeholder={active ? 'Find a publisher or subject' : 'Find an exam or material'} value={search} onChange={event => setSearch(event.target.value)} /></label>
      {active ? <div className="preparation-publishers">{materials.map(material => <button className="preparation-material" key={material.id} onClick={() => library.onOpen(material)}><ExamArtwork identity={material} /><span><strong>{publisherName(material)}</strong><small>{material.title || material.name} · {material.questions.length.toLocaleString()} {material.questions.length === 1 ? 'question' : 'questions'}</small></span><ArrowRight size={19} /></button>)}{!materials.length && <p className="preparation-no-results">No matching saved materials.</p>}</div> : <div className="preparation-environments">{visible.map(environment => <button className="preparation-environment" key={environment.id} onClick={() => { onPreparation({ ...preparation, activeEnvironment: environment.id }); setSearch(''); }}><ExamArtwork identity={environment} /><span><strong>{environment.name}</strong>{environment.organization && <small>{environment.organization}</small>}<small>{environment.materials.length} saved {environment.materials.length === 1 ? 'collection' : 'collections'}</small></span><ArrowRight size={19} /></button>)}</div>}
      {!environments.length ? <div className="library-empty"><BookOpen size={30} strokeWidth={1.3} /><h3>No saved exams yet.</h3><button className="study-primary" onClick={() => setExploring(true)}>Find an exam<ArrowRight size={17} /></button><button className="text-button" onClick={library.onUpload}><Upload size={17} />Add material</button></div> : !active && !visible.length && <p className="preparation-no-results">No matching downloaded exams.</p>}
      {environments.length > 0 && <button className="text-button preparation-add" onClick={library.onUpload}><Upload size={17} />Add your own material</button>}
    </div>
  </main>;
}
