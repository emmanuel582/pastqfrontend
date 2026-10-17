import { useEffect, useMemo, useRef, useState } from 'react';
import ScholarMascot from '../ScholarMascot';
import { ArrowLeft, ArrowRight, Check, BookOpen, Clock3 } from 'lucide-react';
import { selectSessionQuestions, customDurationSeconds, getAvailableSubjects, getAvailableYears, getAvailableTopics, getQuestionCountBySubject, getQuestionCountByTopic, getQuestionCountByYear, type CbtQuestion } from '../../../utils/cbtFilters';

export interface CustomizeCbtBundle { id: string; title?: string; name?: string; kind?: string; examType?: string; university?: string; manufacturer?: string; questions: CbtQuestion[] }
interface Props {
  bundle: CustomizeCbtBundle;
  onBack?: () => void;
  onProceed: (opts: { questions: CbtQuestion[]; durationSeconds: number; mode: 'practice' | 'full'; subjects: string[]; years: string[]; topics: string[] }) => void | Promise<void>;
}
export function CustomizeCbtScreen({ bundle, onProceed, onBack }: Props) {
  const subjects = useMemo(() => getAvailableSubjects(bundle), [bundle]);
  const [selectedSubjects, setSubjects] = useState(subjects);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [mode, setMode] = useState<'practice' | 'full'>('practice');
  const [duration, setDuration] = useState('20');
  const durationEdited = useRef(false);
  const [limit, setLimit] = useState(bundle.kind === 'utme-bank' ? '20' : 'all');
  const [shuffle, setShuffle] = useState(false);
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  const [error, setError] = useState('');
  const [allTopics, setAllTopics] = useState(true);
  const [selectedTopics, setTopics] = useState<string[]>([]);
  const [allYears, setAllYears] = useState(true);
  const [selectedYears, setYears] = useState<string[]>([]);
  const years = useMemo(() => getAvailableYears(bundle.questions, selectedSubjects), [bundle.questions, selectedSubjects]);
  const subjectCounts = useMemo(() => getQuestionCountBySubject(bundle.questions), [bundle.questions]);
  const yearCounts = useMemo(() => getQuestionCountByYear(bundle.questions, selectedSubjects), [bundle.questions, selectedSubjects]);
  const yearPool = useMemo(() => selectSessionQuestions(bundle.questions, { subjects: selectedSubjects, years: allYears ? null : selectedYears, topics: null }), [bundle.questions, selectedSubjects, allYears, selectedYears]);
  const topics = useMemo(() => getAvailableTopics(yearPool), [yearPool]);
  const topicCounts = useMemo(() => getQuestionCountByTopic(yearPool), [yearPool]);
  useEffect(() => { setSubjects(subjects); setAllTopics(true); setTopics([]); setAllYears(true); setYears([]); }, [bundle.id]);
  useEffect(() => { setTopics(previous => previous.filter(topic => topics.includes(topic))); }, [topics]);
  useEffect(() => { setYears(previous => previous.filter(year => years.includes(year))); }, [years]);
  const filtered = useMemo(() => selectSessionQuestions(yearPool, { subjects: selectedSubjects, years: null, topics: allTopics ? null : selectedTopics }), [yearPool, selectedSubjects, allTopics, selectedTopics]);
  const durationSeconds = customDurationSeconds(duration);
  const timeLabel = durationSeconds === null ? 'Set time' : `${Number(duration)} min`;
  const topicLabel = allTopics ? 'All topics' : selectedTopics.length === 1 ? selectedTopics[0] : `${selectedTopics.length} topics`;
  const yearLabel = allYears ? 'All years' : selectedYears.length ? selectedYears.join(', ') : 'Choose a year';
  const count = limit === 'all' ? filtered.length : Math.min(Number(limit), filtered.length);
  const title = bundle.title || bundle.name || bundle.manufacturer || 'Your material';
  const empty = !selectedSubjects.length ? 'Choose a subject.' : !allYears && !selectedYears.length ? 'Choose a year.' : !allTopics && !selectedTopics.length ? 'Choose a topic.' : 'No questions match this selection.';
  function toggle(value: string, list: string[], set: (list: string[]) => void) { set(list.includes(value) ? list.filter(item => item !== value) : [...list, value]); }
  async function begin() {
    if (!count || starting.current || durationSeconds === null) return;
    starting.current = true; setBusy(true); setError('');
    const questions = [...filtered];
    if (shuffle) for (let i = questions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [questions[i], questions[j]] = [questions[j], questions[i]]; }
    try { await onProceed({ questions: questions.slice(0, count), durationSeconds, mode, subjects: selectedSubjects, years: allYears ? [] : selectedYears, topics: allTopics ? [] : selectedTopics }); }
    catch { setError('Could not start this session. Please try again.'); setBusy(false); starting.current = false; }
  }
  const start = <button className="study-primary" disabled={!count || busy || durationSeconds === null} onClick={begin}>{busy ? 'Preparing…' : 'Start session'}<ArrowRight size={18} /></button>;
  return <main className="study-app setup-screen">
    <header className="study-topbar">{onBack && <button className="icon-button" aria-label="Back to Browse" onClick={onBack}><ArrowLeft size={20} /></button>}<span className="wordmark">past<span>q</span><span className="wordmark-rule" /></span></header>
    <div className="setup-scroll"><div className="setup-heading"><div><h1>{bundle.kind === 'utme-bank' ? 'UTME' : 'Your session.'}</h1><p>{bundle.kind === 'utme-bank' ? `${bundle.questions.length.toLocaleString()} questions · ${subjects.length} subjects` : title}</p></div><div className="setup-mobile-scholar"><ScholarMascot state="thinking" compact /></div></div>
      <div className="setup-layout"><div className="setup-fields">
        <section className="setup-section"><div className="mode-choices">{(['practice', 'full'] as const).map(value => <button key={value} className={mode === value ? 'selected' : ''} aria-pressed={mode === value} onClick={() => { setMode(value); if (!durationEdited.current) setDuration(value === 'practice' ? '20' : '60'); }}>{value === 'practice' ? <BookOpen size={22} /> : <Clock3 size={22} />}<strong>{value === 'practice' ? 'Practice' : 'Exam'}</strong>{mode === value && <Check size={19} />}</button>)}</div></section>
        <section className="setup-section" aria-label="Subjects"><div className="section-title"><h2>Subjects</h2><div className="selection-actions"><button className="text-button" onClick={() => setSubjects(subjects)}>Select all</button><button className="text-button" onClick={() => setSubjects([])}>Clear</button></div></div>
          {subjects.length > 8 && <input className="subject-search" aria-label="Find a subject" placeholder="Find a subject" value={subjectSearch} onChange={event => setSubjectSearch(event.target.value)} />}
          <div className={`selection-list ${bundle.kind === 'utme-bank' ? 'utme-subjects' : ''}`}>{subjects.filter(subject => subject.toLowerCase().includes(subjectSearch.trim().toLowerCase())).map(subject => <label key={subject} className={`selection-row ${selectedSubjects.includes(subject) ? 'selected' : ''}`}><input type="checkbox" aria-label={subject} checked={selectedSubjects.includes(subject)} onChange={() => toggle(subject, selectedSubjects, setSubjects)} /><span>{subject}</span><small>{subjectCounts[subject]}</small></label>)}</div>
        </section>
        {years.length > 0 && <section className="setup-section" aria-label="Years"><div className="section-title"><h2>Years</h2><label className="compact-check"><input type="checkbox" checked={allYears} onChange={event => { setAllYears(event.target.checked); setYears([]); }} />All years</label></div><div className="year-options">{years.map(year => <label key={year}><input type="checkbox" aria-label={year} checked={!allYears && selectedYears.includes(year)} onChange={() => { if (allYears) { setAllYears(false); setYears([year]); } else toggle(year, selectedYears, setYears); }} /><span>{year}</span><small>{yearCounts[year] || 0}</small></label>)}</div></section>}
        {topics.length > 0 && <details className="setup-section setup-topic-settings"><summary>Topics <span>{allTopics ? 'All topics' : `${selectedTopics.length} selected`}</span></summary><label className="compact-check"><input type="checkbox" checked={allTopics} onChange={event => { setAllTopics(event.target.checked); setTopics([]); }} />All topics</label><div className="selection-list topic-selection">{topics.map(topic => <label key={topic} className={`selection-row ${!allTopics && selectedTopics.includes(topic) ? 'selected' : ''}`}><input type="checkbox" checked={!allTopics && selectedTopics.includes(topic)} onChange={() => { if (allTopics) { setAllTopics(false); setTopics([topic]); } else toggle(topic, selectedTopics, setTopics); }} /><span>{topic}</span><small>{topicCounts[topic] || 0}</small></label>)}</div></details>}
        <section className="setup-section"><div className="section-title"><h2>Session settings</h2></div><div className="setting-inputs"><label>Questions<select aria-label="Questions" value={limit} onChange={event => setLimit(event.target.value)}><option value="all">All available ({filtered.length})</option>{[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} questions</option>)}</select></label><label htmlFor="session-time">Time limit<div className={`duration-input ${durationSeconds === null ? 'invalid' : ''}`}><Clock3 size={17} /><input id="session-time" aria-label="Time limit in minutes" type="number" inputMode="decimal" min="0" step="any" value={duration} onChange={event => { durationEdited.current = true; setDuration(event.target.value); }} aria-invalid={durationSeconds === null} /><span>min</span></div></label></div>{durationSeconds === null && <p className="selection-error" role="alert">Enter a time greater than zero.</p>}<label className="shuffle-setting"><span>Shuffle questions</span><input type="checkbox" checked={shuffle} onChange={event => setShuffle(event.target.checked)} /></label></section>
      </div><aside className="setup-summary"><div className="setup-scholar"><ScholarMascot state="thinking" compact /></div><h2 aria-live="polite">{count}<span> {count === 1 ? 'question' : 'questions'}</span></h2><div className="summary-line"><span>Mode</span><strong>{mode === 'full' ? 'Exam' : 'Practice'}</strong></div><div className="summary-line"><span>Time</span><strong>{timeLabel}</strong></div><div className="summary-line"><span>Subjects</span><strong>{selectedSubjects.length}</strong></div><div className="summary-line"><span>Years</span><strong>{yearLabel}</strong></div><div className="summary-line"><span>Topics</span><strong>{topicLabel}</strong></div><div className="desktop-start">{start}</div>{!count && <p className="selection-error" role="status">{empty}</p>}{error && <p role="alert" className="selection-error">{error}</p>}</aside></div>
    </div><footer className="setup-mobile-footer"><div aria-live="polite"><strong>{count} {count === 1 ? 'question' : 'questions'}</strong><span>{timeLabel} · {mode === 'full' ? 'Exam' : 'Practice'} · {allYears ? 'All years' : `${selectedYears.length} selected`}</span></div>{start}</footer>
  </main>;
}
