import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, BookOpen, Clock3, SlidersHorizontal } from 'lucide-react';
import { selectSessionQuestions, customDurationSeconds, getAvailableSubjects, getAvailableYears, getAvailableTopics, getQuestionCountBySubject, getQuestionCountByTopic, type CbtQuestion } from '../../../utils/cbtFilters';

export interface CustomizeCbtBundle { id: string; title?: string; name?: string; examType?: string; university?: string; manufacturer?: string; questions: CbtQuestion[] }
interface Props {
  bundle: CustomizeCbtBundle;
  onProceed: (opts: { questions: CbtQuestion[]; durationSeconds: number; mode: 'practice' | 'full'; subjects: string[]; years: string[]; topics: string[] }) => void | Promise<void>;
}
export function CustomizeCbtScreen({ bundle, onProceed }: Props) {
  const subjects = useMemo(() => getAvailableSubjects(bundle), [bundle]);
  const [selectedSubjects, setSubjects] = useState(subjects);
  const [mode, setMode] = useState<'practice' | 'full'>('practice');
  const [duration, setDuration] = useState('20');
  const durationEdited = useRef(false);
  const [limit, setLimit] = useState('all');
  const [shuffle, setShuffle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [allTopics, setAllTopics] = useState(true);
  const [selectedTopics, setTopics] = useState<string[]>([]);
  const [allYears, setAllYears] = useState(true);
  const [selectedYears, setYears] = useState<string[]>([]);
  const years = useMemo(() => getAvailableYears(bundle.questions, selectedSubjects), [bundle.questions, selectedSubjects]);
  const topics = useMemo(() => getAvailableTopics(bundle.questions, selectedSubjects), [bundle.questions, selectedSubjects]);
  const subjectCounts = getQuestionCountBySubject(bundle.questions);
  const topicCounts = getQuestionCountByTopic(selectSessionQuestions(bundle.questions, { subjects: selectedSubjects, years: allYears ? null : selectedYears, topics: null }));
  useEffect(() => { setSubjects(subjects); setAllTopics(true); setTopics([]); setAllYears(true); setYears([]); }, [bundle.id]);
  useEffect(() => { setTopics(prev => prev.filter(t => topics.includes(t))); setYears(prev => prev.filter(y => years.includes(y))); }, [topics, years]);
  const filtered = useMemo(() => selectSessionQuestions(bundle.questions, {
    subjects: selectedSubjects, years: allYears ? null : selectedYears, topics: allTopics ? null : selectedTopics,
  }), [bundle.questions, selectedSubjects, allYears, selectedYears, allTopics, selectedTopics]);
  const durationSeconds = customDurationSeconds(duration);
  const timeLabel = durationSeconds === null ? 'Set time' : `${Number(duration)} min`;
  const topicLabel = allTopics ? 'All topics' : selectedTopics.length === 1 ? selectedTopics[0] : `${selectedTopics.length} topics`;
  const yearLabel = allYears ? 'All years' : selectedYears.length ? selectedYears.join(', ') : 'No years selected';
  const count = limit === 'all' ? filtered.length : Math.min(Number(limit), filtered.length);
  const title = bundle.title || bundle.name || bundle.manufacturer || 'Your material';
  function toggle(value: string, list: string[], set: (list: string[]) => void) { set(list.includes(value) ? list.filter(item => item !== value) : [...list, value]); }
  async function begin() {
    if (!count || busy || durationSeconds === null) return;
    setBusy(true); setError('');
    const questions = [...filtered];
    if (shuffle) for (let i = questions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [questions[i], questions[j]] = [questions[j], questions[i]]; }
    try { await onProceed({ questions: questions.slice(0, count), durationSeconds, mode, subjects: selectedSubjects, years: allYears ? [] : selectedYears, topics: allTopics ? [] : selectedTopics }); }
    catch { setError('Could not start this session. Please try again.'); setBusy(false); }
  }
  return <main className="study-app setup-screen"><header className="study-topbar"><span className="wordmark">past<span>q</span><span className="wordmark-rule" /></span></header><div className="setup-scroll"><div className="setup-heading"><span className="eyebrow">MAKE IT YOUR SESSION</span><h1>A little focus.<br />A lot of progress.</h1><p>{title}</p></div><div className="setup-layout"><div className="setup-fields"><section className="setup-section"><div className="section-title"><h2>How do you want to practise?</h2></div><div className="mode-choices"><button className={mode === 'practice' ? 'selected' : ''} aria-pressed={mode === 'practice'} onClick={() => { setMode('practice'); if (!durationEdited.current) setDuration('20'); }}><BookOpen size={22} /><span><strong>Practice</strong><small>Build your confidence</small></span>{mode === 'practice' && <Check size={19} />}</button><button className={mode === 'full' ? 'selected' : ''} aria-pressed={mode === 'full'} onClick={() => { setMode('full'); if (!durationEdited.current) setDuration('60'); }}><Clock3 size={22} /><span><strong>Exam</strong><small>Review at the finish</small></span>{mode === 'full' && <Check size={19} />}</button></div></section>
    <section className="setup-section"><div className="section-title"><h2>Subjects</h2><button className="text-button" onClick={() => setSubjects(subjects)}>Select all</button></div><div className="selection-list">{subjects.map(subject => <label key={subject} className={`selection-row ${selectedSubjects.includes(subject) ? 'selected' : ''}`}><input type="checkbox" checked={selectedSubjects.includes(subject)} onChange={() => toggle(subject, selectedSubjects, setSubjects)} /><span>{subject}</span><small>{subjectCounts[subject]}</small></label>)}</div></section>
    {topics.length > 0 && <section className="setup-section"><div className="section-title"><h2>Topics</h2><label className="compact-check"><input type="checkbox" checked={allTopics} onChange={e => { setAllTopics(e.target.checked); setTopics(e.target.checked ? topics : []); }} />All topics</label></div><div className="selection-list topic-selection">{topics.map(topic => <label key={topic} className={`selection-row ${allTopics || selectedTopics.includes(topic) ? 'selected' : ''}`}><input type="checkbox" checked={allTopics || selectedTopics.includes(topic)} onChange={() => { if (allTopics) { setAllTopics(false); setTopics(topics.filter(t => t !== topic)); } else toggle(topic, selectedTopics, setTopics); }} /><span>{topic}</span><small>{topicCounts[topic] || 0}</small></label>)}</div></section>}
    <section className="setup-section"><div className="section-title"><h2>Session settings</h2><SlidersHorizontal size={18} /></div><div className="setting-inputs"><label>Questions<select value={limit} onChange={e => setLimit(e.target.value)}><option value="all">All available ({filtered.length})</option>{[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} questions</option>)}</select></label><label htmlFor="session-time">Time limit<div className={`duration-input ${durationSeconds === null ? 'invalid' : ''}`}><Clock3 size={17} /><input id="session-time" aria-label="Time limit in minutes" type="number" inputMode="decimal" min="0" step="any" value={duration} onChange={e => { durationEdited.current = true; setDuration(e.target.value); }} aria-invalid={durationSeconds === null} aria-describedby={durationSeconds === null ? 'duration-error' : undefined} /><span>min</span></div></label></div>{durationSeconds === null && <p id="duration-error" className="selection-error" role="alert">Enter a time greater than zero.</p>}<label className="shuffle-setting"><span>Shuffle questions</span><input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} /></label>
    {years.length > 0 && <details className="years-setting" open><summary>Years <span>{yearLabel}</span></summary><label className="compact-check"><input type="checkbox" checked={allYears} onChange={e => { setAllYears(e.target.checked); setYears(e.target.checked ? years : []); }} />All years</label><div className="year-options">{years.map(year => <label key={year}><input type="checkbox" checked={allYears || selectedYears.includes(year)} onChange={() => { if (allYears) { setAllYears(false); setYears(years.filter(y => y !== year)); } else toggle(year, selectedYears, setYears); }} />{year}</label>)}</div></details>}
    </section></div><aside className="setup-summary"><div className="summary-paper-icon"><BookOpen size={42} strokeWidth={1.3} /></div><span className="eyebrow">YOUR SESSION</span><h2 aria-live="polite">{count}<span> {count === 1 ? "question" : "questions"}</span></h2><div className="summary-line"><span>Mode</span><strong>{mode === 'full' ? 'Exam' : 'Practice'}</strong></div><div className="summary-line"><span>Time</span><strong>{timeLabel}</strong></div><div className="summary-line"><span>Subjects</span><strong>{selectedSubjects.length}</strong></div><div className="summary-line"><span>Topics</span><strong>{topicLabel}</strong></div><div className="summary-line"><span>Years</span><strong>{yearLabel}</strong></div><button className="study-primary desktop-start" disabled={!count || busy || durationSeconds === null} onClick={begin}>{busy ? 'Preparing…' : 'Start session'}<ArrowRight size={18} /></button>{!count && <p className="selection-error">{!selectedSubjects.length ? 'Select a subject.' : !allTopics && !selectedTopics.length ? 'Select a topic.' : !allYears && !selectedYears.length ? 'Select a year.' : 'No questions match these topics and years.'}</p>}{error && <p role="alert" className="selection-error">{error}</p>}</aside></div></div><footer className="setup-mobile-footer"><div aria-live="polite"><strong>{count} {count === 1 ? "question" : "questions"}</strong><span>{timeLabel} · {mode === 'full' ? 'Exam' : 'Practice'} · {allYears ? 'All years' : selectedYears.length === 1 ? selectedYears[0] : `${selectedYears.length} years`} · {allTopics ? 'All topics' : `${selectedTopics.length} ${selectedTopics.length === 1 ? "topic" : "topics"}`}</span></div><button className="study-primary" disabled={!count || busy || durationSeconds === null} onClick={begin}>{busy ? 'Preparing…' : 'Start session'}<ArrowRight size={17} /></button></footer></main>;
}
