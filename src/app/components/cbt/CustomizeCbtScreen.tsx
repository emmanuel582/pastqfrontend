import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock3, Pencil, Plus, Search, X } from 'lucide-react';
import ScholarMascot from '../ScholarMascot';
import { learningProgress } from '../../../services/learningProgress';
import StudyDialog from '../StudyDialog';
import { customDurationSeconds, getAvailableSubjects, getAvailableTopics, isCbtQuestion, type CbtQuestion } from '../../../utils/cbtFilters';
import { buildSubjectSession, calendarYear, defaultSubjectSettings, subjectPapers, subjectPool, subjectQuestionCount, subjectYears, type SubjectSettings } from '../../../utils/subjectSession';
import { environmentFor, publisherName } from '../../../services/preparation';

export interface CustomizeCbtBundle { id: string; title?: string; name?: string; kind?: string; examType?: string; university?: string; manufacturer?: string; questions: CbtQuestion[]; updateAvailable?:boolean; revisionSet?:boolean; suggestion?:{subject:string;topic:string;year?:string;paper?:string} }
interface Props {
  bundle: CustomizeCbtBundle;
  ownerId?: string;
  onBack?: () => void;
  onUpdateMaterial?:()=>void;
  onProceed: (opts: { questions: CbtQuestion[]; durationSeconds: number; mode: 'practice' | 'full'; subjects: string[]; years: string[]; topics: string[] }) => void | Promise<void>;
}
type Step = 'subjects' | 'settings' | 'review';
const steps: Step[] = ['subjects', 'settings', 'review'];
const stepNames = { subjects: 'Subjects', settings: 'Session', review: 'Review' };

export function CustomizeCbtScreen({ bundle, ownerId = '', onProceed, onBack, onUpdateMaterial }: Props) {
  const subjects = useMemo(() => getAvailableSubjects(bundle), [bundle]);
  const bySubject = useMemo(() => {
    const map: Record<string, CbtQuestion[]> = Object.create(null);
    for (const question of bundle.questions) if (isCbtQuestion(question)) (map[question.subject] ||= []).push(question);
    return map;
  }, [bundle.questions]);
  const storageKey = ownerId ? `pastq-session:${ownerId}:${bundle.id}${bundle.revisionSet?":revision":bundle.suggestion?":topic-plan":""}` : '';
  const initial = useMemo(() => {
    let saved: any;
    try { saved = storageKey ? JSON.parse(localStorage.getItem(storageKey) || 'null') : null; } catch {}
    const settings: Record<string, SubjectSettings> = Object.create(null);
    for (const subject of subjects) {
      const defaults = defaultSubjectSettings(bySubject[subject] || []), old = saved?.settings?.[subject];
      settings[subject] = old && ['paper', 'topic'].includes(old.studyBy) && (old.studyBy !== 'paper' || subjectYears(bySubject[subject] || []).includes(old.year))
        && (old.topics === null || Array.isArray(old.topics) && old.topics.every((topic: unknown) => typeof topic === 'string'))
        && (old.count === 'all' || /^\d{1,5}$/.test(old.count)) ? { ...defaults, ...old } : defaults;
    }
    for(const subject of subjects) { if(bundle.revisionSet)settings[subject]={...settings[subject],studyBy:'topic',selectedSet:true,count:'all'};if(bundle.suggestion?.subject===subject)settings[subject]={...settings[subject],studyBy:bundle.suggestion.year?'paper':'topic',year:bundle.suggestion.year||'',paper:bundle.suggestion.paper||'',topics:[bundle.suggestion.topic],count:'10'}; }
    const selected = bundle.suggestion ? [bundle.suggestion.subject] : Array.isArray(saved?.subjects) ? saved.subjects.filter((subject: string) => subjects.includes(subject) && bySubject[subject]?.length) : subjects.length <= 4 ? subjects.filter(subject => bySubject[subject]?.length) : [];
    return { settings, selected, mode: saved?.mode === 'full' ? 'full' as const : 'practice' as const, duration: typeof saved?.duration === 'string' ? saved.duration : '20', shuffle: saved?.shuffle === true, unseenFirst: saved?.unseenFirst !== false, mock: saved?.mock === true };
  }, [storageKey, subjects, bySubject]);
  const isUtme=bundle.kind==='utme-bank'||/^UTME$/i.test(bundle.examType||'');
  const english=subjects.find(subject=>/^(use of )?english( language)?$/i.test(subject));
  const [mock,setMock]=useState(initial.mock);
  const [seen,setSeen]=useState<Set<string>>(new Set()),[unseenFirst,setUnseenFirst]=useState(initial.unseenFirst);
  useEffect(()=>{let active=true;learningProgress(ownerId,bundle.id).then(rows=>{if(active)setSeen(new Set(rows.filter(row=>row.outcome!=='skipped').map(row=>row.key)))}).catch(()=>{});return()=>{active=false};},[ownerId,bundle.id]);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [settings, setSettings] = useState(initial.settings);
  const [mode, setMode] = useState<'practice' | 'full'>(initial.mode);
  const [duration, setDuration] = useState(initial.duration);
  const [shuffle, setShuffle] = useState(initial.shuffle);
  const [step, setStep] = useState<Step>('subjects');
  const [editing, setEditing] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [topicPicker, setTopicPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const starting = useRef(false), durationEdited = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }); }, [step, editing]);
  useEffect(() => {
    if (storageKey) try { localStorage.setItem(storageKey, JSON.stringify({ subjects: selected, settings, mode, duration, shuffle, unseenFirst, mock })); } catch {}
  }, [storageKey, selected, settings, mode, duration, shuffle, unseenFirst, mock]);
  const counts = useMemo(() => Object.fromEntries(selected.map(subject => [subject, subjectQuestionCount(bySubject[subject] || [], settings[subject])])), [selected, bySubject, settings]);
  const count = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const invalidSubject = selected.find(subject => !counts[subject]);
  const durationSeconds = customDurationSeconds(duration);
  const mockError=mock?(!english||!selected.includes(english)||selected.length!==4?'Choose English and three other subjects.':selected.find(subject=>counts[subject]<(subject===english?60:40))?`Choose a paper with at least ${selected.find(subject=>counts[subject]<(subject===english?60:40))===english?60:40} questions for ${selected.find(subject=>counts[subject]<(subject===english?60:40))}.`:''):'';
  const ready = selected.length > 0 && !invalidSubject && durationSeconds !== null && (!mock || mode === 'full' && durationSeconds === 7200) && !mockError;
  const environment = environmentFor(bundle), publisher = publisherName(bundle);
  const subtitle = [...new Set([bundle.title !== environment.name ? bundle.title : '', publisher !== 'Saved material' ? publisher : ''].filter(Boolean))].join(' · ');
  function update(subject: string, changes: Partial<SubjectSettings>) { setSettings(previous => ({ ...previous, [subject]: { ...previous[subject], ...changes } })); setError(''); }
  function applyMock(){if(!english)return;setMock(true);setMode('full');setDuration('120');setShuffle(false);setSelected(previous=>[english,...previous.filter(s=>s!==english).slice(0,3)]);setSettings(previous=>Object.fromEntries(Object.entries(previous).map(([s,value])=>[s,{...value,count:s===english?'60':'40'}])));}
  function toggleSubject(subject: string) { if(mock&&subject===english)return;if(mock&&!selected.includes(subject)&&selected.length>=4)return;if(mock)update(subject,{count:subject===english?'60':'40'});setSelected(previous => previous.includes(subject) ? previous.filter(value => value !== subject) : [...previous, subject]); }
  function back() { if (editing) setEditing(null); else if (step !== 'subjects') setStep(steps[steps.indexOf(step) - 1]); else onBack?.(); }
  function description(subject: string) {
    const value = settings[subject];
    const questions = counts[subject] || 0;
    return [value.studyBy === 'paper' ? value.paper || value.year : 'Topic practice', value.topics === null ? 'All topics' : `${value.topics.length} topics`, `${questions} question${questions === 1 ? '' : 's'}`].join(' · ');
  }
  async function begin() {
    if (!ready || starting.current || durationSeconds === null) return;
    starting.current = true; setBusy(true); setError('');
    try {
      const questions = buildSubjectSession(selected, bySubject, settings, shuffle, mode==='practice'&&unseenFirst?seen:undefined);
      if (!questions.length) throw new Error('Empty selection');
      await onProceed({ questions, durationSeconds, mode, subjects: selected, years: [...new Set(selected.filter(subject => settings[subject].studyBy === 'paper').map(subject => settings[subject].year))], topics: selected.flatMap(subject => settings[subject].topics || []) });
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not start this session. Please try again.'); starting.current = false; setBusy(false); }
  }
  const activeStep = editing ? 'subjects' : step;
  const stepDetails = {subjects: `${selected.length} selected`, settings: `${mode === 'full' ? 'Exam' : 'Practice'} · ${durationSeconds === null ? 'Set time' : duration + ' min'}`, review: ready ? `${count} questions` : 'Check selection'};
  const currentSettings = editing ? settings[editing] : null;
  const currentQuestions = editing ? bySubject[editing] || [] : [];
  const years = useMemo(() => subjectYears(currentQuestions), [currentQuestions]);
  const papers = currentSettings ? subjectPapers(currentQuestions, currentSettings.year) : [];
  const topicPool = currentSettings ? subjectPool(currentQuestions, { ...currentSettings, topics: null }) : [];
  const topics = getAvailableTopics(topicPool);
  if (topicPool.some(question => !question.topic && !question.section)) topics.push('Unsectioned');

  return <main className="study-app session-builder" aria-busy={busy}>
    <header className="study-topbar builder-topbar"><button className="icon-button" aria-label={editing ? 'Back to session setup' : step === 'subjects' ? 'Back to library' : 'Previous setup step'} onClick={back}><ArrowLeft size={20} /></button><span className="builder-context"><strong>{environment.name}</strong>{subtitle && <small>{subtitle}</small>}</span><span className="wordmark">past<span>q</span></span></header>
    {bundle.updateAvailable&&onUpdateMaterial&&<div className="builder-search-link"><button className="text-button" onClick={onUpdateMaterial}>Update available</button></div>}
    <nav className="builder-steps" aria-label="Session setup">{steps.map((value, index) => <button key={value} aria-label={stepNames[value]} aria-current={activeStep === value ? 'step' : undefined} disabled={value !== 'subjects' && !selected.length} onClick={() => { setEditing(null); setStep(value); }}><span className="builder-step-number" aria-hidden="true">{index + 1}</span><span className="builder-step-label"><strong>{stepNames[value]}</strong><small>{stepDetails[value]}</small></span></button>)}</nav>
    <div className="builder-scroll" ref={scroll}>
      <div className="builder-content">
        {isUtme&&!bundle.revisionSet&&!editing&&step==='subjects'&&<div className="mock-choice" role="group" aria-label="Session format"><button aria-pressed={!mock} onClick={()=>setMock(false)}>Custom</button><button aria-pressed={mock} disabled={!english} onClick={applyMock}>UTME mock</button></div>}
        {mock&&<p className="student-setting-note">English 60 + three subjects of 40 · 120 minutes · 2026 format</p>}
        {mockError&&<p className="selection-error" role="status">{mockError}</p>}
        {editing && currentSettings ? <section className="subject-editor" aria-label={`Settings for ${editing}`}>
          <div className="builder-heading"><h1>{editing}</h1><span>{counts[editing]} questions</span></div>
          {years.length > 0 && currentQuestions.some(question => !calendarYear(question)) && <label className="builder-field"><span>Study by</span><select aria-label={`Study by for ${editing}`} value={currentSettings.studyBy} onChange={event => update(editing, { studyBy: event.target.value as 'paper' | 'topic', topics: null })}><option value="paper">Past paper</option><option value="topic">Topic practice</option></select></label>}
          {currentSettings.studyBy === 'paper' && years.length > 0 && <>
            <label className="builder-field"><span>Year</span><select aria-label={`Year for ${editing}`} value={currentSettings.year} onChange={event => { const year = event.target.value, available = subjectPapers(currentQuestions, year); update(editing, { year, paper: available.includes(year) ? year : available[0] || '', topics: null }); }}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
            {papers.length > 1 && <label className="builder-field"><span>Paper</span><select aria-label={`Paper for ${editing}`} value={currentSettings.paper} onChange={event => update(editing, { paper: event.target.value, topics: null })}>{papers.map(paper => <option key={paper} value={paper}>{paper}</option>)}</select></label>}
          </>}
          {topics.length > 0 && <button className="builder-field field-button" onClick={() => setTopicPicker(true)}><span>{currentSettings.studyBy === 'topic' ? 'Topics / sections' : 'Topics'}</span><strong>{currentSettings.topics === null ? 'All' : `${currentSettings.topics.length} selected`}</strong><ChevronRight size={18} /></button>}
          <label className="builder-field"><span>Questions</span><select aria-label={`Questions for ${editing}`} disabled={mock} value={currentSettings.count} onChange={event => update(editing, { count: event.target.value })}>{[10, 20, 30, 40, 50, 60, ...(!['10','20','30','40','50','60','all'].includes(currentSettings.count) ? [Number(currentSettings.count)] : [])].map(value => <option key={value} value={value}>{value}</option>)}<option value="all">All available ({subjectPool(currentQuestions, currentSettings).length})</option></select></label>
          {counts[editing] === 0 && <p className="selection-error" role="status">No questions selected. Choose a topic or another paper.</p>}
          <div className="subject-editor-foot"><BookOpen size={18} /><span>{subjectPool(currentQuestions, currentSettings).length.toLocaleString()} available in this selection</span></div>
        </section> : step === 'subjects' ? <section aria-label="Selected subjects">
          <div className="builder-heading"><h1>Subjects</h1><button className="text-button" onClick={() => { setSearch(''); setPicker(true); }}><Plus size={17} />{selected.length ? 'Change' : 'Choose subjects'}</button></div>
          {selected.length ? <div className="builder-subjects">{selected.map((subject, index) => <div className="builder-subject" key={subject}><span className="subject-order">{String(index + 1).padStart(2, '0')}</span><button className="subject-edit-link" aria-label={`Edit ${subject}`} onClick={() => setEditing(subject)}><strong>{subject}</strong><small>{description(subject)}</small></button><button className="icon-button" aria-label={`Edit ${subject} settings`} onClick={() => setEditing(subject)}><Pencil size={17} /></button><button className="icon-button" aria-label={`Remove ${subject}`} disabled={mock&&subject===english} onClick={() => toggleSubject(subject)}><X size={16} /></button></div>)}</div> : <div className="builder-empty"><ScholarMascot state="thinking" compact /><button className="study-primary" onClick={() => { setSearch(''); setPicker(true); }}>Choose subjects<Plus size={17} /></button></div>}
        </section> : step === 'settings' ? <section aria-label="Session settings">
          <div className="builder-heading"><h1>Session</h1></div>
          <div className="mode-choices">{(['practice', 'full'] as const).map(value => <button key={value} aria-pressed={mode === value} className={mode === value ? 'selected' : ''} onClick={() => { setMode(value); if(value==='practice')setMock(false); if (mock && value === 'full') setDuration('120'); else if (!durationEdited.current) setDuration(value === 'practice' ? '20' : '60'); }}>{value === 'practice' ? <BookOpen size={22} /> : <Clock3 size={22} />}<strong>{value === 'practice' ? 'Practice' : 'Exam'}</strong>{mode === value && <Check size={18} />}</button>)}</div>
          <label className="builder-field"><span>Time limit</span><div className="duration-input"><Clock3 size={17} /><input aria-label="Time limit in minutes" type="number" inputMode="decimal" min="0" step="any" disabled={mock} value={duration} onChange={event => { durationEdited.current = true; setDuration(event.target.value); }} aria-invalid={durationSeconds === null} /><span>min</span></div></label>
          {durationSeconds === null && <p className="selection-error" role="alert">Enter a time greater than zero.</p>}
          {mode==='practice'&&!bundle.revisionSet&&<label className="builder-field"><span>Start with unseen questions</span><input type="checkbox" checked={unseenFirst} onChange={e=>setUnseenFirst(e.target.checked)}/></label>}
          <label className="builder-field"><span>Shuffle within each subject</span><input type="checkbox" checked={shuffle} onChange={event => setShuffle(event.target.checked)} /></label>
        </section> : <section aria-label="Review session">
          <div className="builder-heading"><h1>Review</h1></div>
          <div className="builder-review-total"><strong>{count.toLocaleString()}</strong><span>questions · {duration} min · {mode === 'full' ? 'Exam' : 'Practice'}</span></div>
          <div className="builder-review-list">{selected.map(subject => <button key={subject} aria-label={`Revise ${subject}`} onClick={() => setEditing(subject)}><span><strong>{subject}</strong><small>{description(subject)}</small></span><Pencil size={17} /></button>)}</div>
          <button className="text-button" onClick={() => setStep('settings')}>Change session settings<ChevronRight size={16} /></button>
        </section>}
        {error && <p className="selection-error" role="alert">{error}</p>}
        {!editing && invalidSubject && <p className="selection-error" role="status">Choose questions for {invalidSubject}.</p>}
      </div>
    </div>
    <footer className="builder-footer"><div><strong>{count.toLocaleString()} questions</strong><small>{selected.length} {selected.length === 1 ? 'subject' : 'subjects'}</small></div>{editing ? <button className="study-primary" onClick={() => setEditing(null)}>Done<Check size={17} /></button> : <button className="study-primary" disabled={busy || (step === 'review' ? !ready : !selected.length || step === 'settings' && durationSeconds === null)} onClick={() => step === 'review' ? void begin() : setStep(steps[steps.indexOf(step) + 1])}>{busy ? 'Preparing…' : step === 'review' ? 'Start session' : 'Continue'}<ArrowRight size={18} /></button>}</footer>
    {picker && <StudyDialog title="Choose subjects" onClose={() => setPicker(false)} className="builder-picker"><label className="builder-search"><Search size={18} /><input aria-label="Find a subject" placeholder="Find a subject" value={search} onChange={event => setSearch(event.target.value)} /></label><div className="builder-picker-options">{subjects.filter(subject => subject.toLowerCase().includes(search.trim().toLowerCase())).map(subject => <label className="selection-row" key={subject}><input type="checkbox" aria-label={subject} checked={selected.includes(subject)} disabled={!bySubject[subject]?.length||mock&&(subject===english||!selected.includes(subject)&&selected.length>=4)} onChange={() => toggleSubject(subject)} /><span>{subject}</span><small>{bySubject[subject]?.length.toLocaleString() || 0}</small></label>)}{!subjects.some(subject => subject.toLowerCase().includes(search.trim().toLowerCase())) && <p>No matching subjects.</p>}</div><button className="study-primary" onClick={() => setPicker(false)}>Done{selected.length > 0 && ` · ${selected.length}`}<Check size={17} /></button></StudyDialog>}
    {topicPicker && editing && currentSettings && <StudyDialog title={`${editing} topics`} onClose={() => setTopicPicker(false)} className="builder-picker"><label className="selection-row"><input type="checkbox" checked={currentSettings.topics === null} onChange={event => update(editing, { topics: event.target.checked ? null : [] })} /><span>All topics</span></label><div className="builder-picker-options">{topics.map(topic => <label className="selection-row" key={topic}><input type="checkbox" checked={currentSettings.topics === null || currentSettings.topics.includes(topic)} onChange={event => { const values = currentSettings.topics === null ? [...topics] : currentSettings.topics; update(editing, { topics: event.target.checked ? [...values, topic] : values.filter(value => value !== topic) }); }} /><span>{topic}</span></label>)}</div><button className="study-primary" onClick={() => setTopicPicker(false)}>Done<Check size={17} /></button></StudyDialog>}
  </main>;
}
