import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Flag, Grid2X2, X, Calculator, PenLine, Grip, Maximize2, Eraser, Undo2, Trash2, Minus, Plus, BookOpen, RotateCcw } from 'lucide-react';
import MathText from '../MathText';
import QuestionMedia, { type QuestionFigure } from '../QuestionMedia';
import { answerIndex, calculate, fitTool, sessionSummary, type ToolRect } from '../../../utils/examSession';

export interface StudyQuestion {
  subject: string; question: string; options: string[]; correct: number | null;
  explanation: string; topic?: string | null; section?: string | null;
  year?: string | number | null;
  passage?: string | null; figures?: QuestionFigure[]; answerText?: string | null;
}
type Destination = 'home' | 'results' | 'exam' | 'review-answers';
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

function Dialog({ title, children, onClose, drawer = false }: { title: string; children: ReactNode; onClose: () => void; drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current; dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`study-dialog ${drawer ? 'question-drawer' : ''}`} onCancel={e => { e.preventDefault(); closeRef.current(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}
  </dialog>;
}

function Feedback({ question, selected }: { question: StudyQuestion; selected: number | null }) {
  const correct = answerIndex(question);
  return <section className="answer-feedback" aria-label="Answer explanation">
    <div className="feedback-title"><BookOpen size={18} /><strong>{correct === null ? 'Answer key unavailable' : selected === null ? 'You left this unanswered' : selected === correct ? 'You got it' : 'A little more practice'}</strong></div>
    {correct !== null && <p>Correct answer: <strong>{String.fromCharCode(65 + correct)}. <MathText text={question.options[correct]} /></strong></p>}
    {correct === null && <p>This question is excluded from your score.</p>}
    {question.answerText && <MathText text={question.answerText} />}
    {question.explanation && <div className="feedback-explanation"><MathText text={question.explanation} /></div>}
  </section>;
}

function FloatingCalculator({ onClose, hidden }: { onClose: () => void; hidden: boolean }) {
  const [rect, setRect] = useState<ToolRect>(() => fitTool({ x: window.innerWidth - 360, y: 100, width: 324, height: 560 }, { width: window.innerWidth, height: window.innerHeight }));
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [error, setError] = useState('');
  const [evaluated, setEvaluated] = useState(false);
  const drag = useRef<{ x: number; y: number; rect: ToolRect; resize: boolean } | null>(null);
  useEffect(() => {
    const resize = () => setRect(r => fitTool(r, { width: window.innerWidth, height: window.innerHeight }));
    window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
  }, []);
  function start(e: PointerEvent<HTMLElement>, resize = false) {
    if (!resize && (e.target as HTMLElement).closest('button')) return;
    drag.current = { x: e.clientX, y: e.clientY, rect, resize }; e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const d = drag.current, dx = e.clientX - d.x, dy = e.clientY - d.y;
    setRect(fitTool(d.resize ? { ...d.rect, width: d.rect.width + dx, height: d.rect.height + dy } : { ...d.rect, x: d.rect.x + dx, y: d.rect.y + dy }, { width: window.innerWidth, height: window.innerHeight }));
  }
  function press(key: string) {
    setError('');
    if (key === 'AC') { setExpression(''); setResult('0'); setEvaluated(false); return; }
    if (key === 'DEL') { setExpression(v => v.slice(0, -1)); setEvaluated(false); return; }
    if (key === '=') { try { const value = calculate(expression || result); setResult(value); setEvaluated(true); } catch { setError('Check your expression'); } return; }
    const operator = /^[+−×÷^%]$/.test(key);
    setExpression(v => (evaluated ? operator ? result : '' : v) + key); setEvaluated(false);
  }
  const keys = ['AC', 'DEL', '(', ')', 'sin(', 'cos(', 'sqrt(', '^', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '.', '0', '%', '+'];
  return <section className="floating-calculator" aria-label="Movable calculator" hidden={hidden} style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
    <header className="tool-heading drag-heading" tabIndex={0} aria-label="Move calculator with arrow keys or drag" onKeyDown={e => {
      const dx = e.key === 'ArrowRight' ? 20 : e.key === 'ArrowLeft' ? -20 : 0;
      const dy = e.key === 'ArrowDown' ? 20 : e.key === 'ArrowUp' ? -20 : 0;
      if (dx || dy) { e.preventDefault(); setRect(r => fitTool({ ...r, x: r.x + dx, y: r.y + dy }, { width: window.innerWidth, height: window.innerHeight })); }
    }} onPointerDown={e => start(e)} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <Grip size={17} /><strong>Calculator</strong><span className="tool-hint">Drag to move</span><button className="icon-button" onClick={onClose} aria-label="Close calculator"><X size={18} /></button>
    </header>
    <div className="calculator-display"><label htmlFor="calculator-input">Expression · degrees</label><input id="calculator-input" aria-label="Calculator expression" value={expression} placeholder="0" onChange={e => { setExpression(e.target.value); setEvaluated(false); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') press('='); e.stopPropagation(); }} /><output aria-live="polite">{error || result}</output></div>
    <div className="calculator-keys">{keys.map(key => <button key={key} onClick={() => press(key)} aria-label={key === 'DEL' ? 'Delete digit' : key}>{key.replace('sqrt(', '√').replace('(', key === '(' ? '(' : '')}</button>)}<button className="equals" onClick={() => press('=')}>=</button></div>
    <button className="resize-corner" aria-label="Resize calculator" title="Drag to resize; arrow keys also work" onPointerDown={e => start(e, true)} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={e => {
      const dx = e.key === 'ArrowRight' ? 20 : e.key === 'ArrowLeft' ? -20 : 0;
      const dy = e.key === 'ArrowDown' ? 20 : e.key === 'ArrowUp' ? -20 : 0;
      if (dx || dy) { e.preventDefault(); setRect(r => fitTool({ ...r, width: r.width + dx, height: r.height + dy }, { width: window.innerWidth, height: window.innerHeight })); }
    }}><Maximize2 size={15} /></button>
  </section>;
}

interface Stroke { points: { x: number; y: number }[]; erase: boolean; size: number }
function DrawingBoard({ question, onClose, hidden }: { question: number; onClose: () => void; hidden: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const notes = useRef(new Map<number, Stroke[]>());
  const history = useRef(new Map<number, Stroke[][]>());
  const active = useRef<Stroke | null>(null);
  const activePointer = useRef<number | null>(null);
  const paintFrame = useRef<number | null>(null);
  const [eraser, setEraser] = useState(false);
  const [size, setSize] = useState(3);
  const [revision, update] = useState(0);
  const strokes = () => notes.current.get(question) || [];
  const canUndo = (history.current.get(question)?.length || 0) > 0;
  function checkpoint() {
    const snapshots = history.current.get(question) || [];
    snapshots.push([...strokes()]);
    if (snapshots.length > 50) snapshots.shift();
    history.current.set(question, snapshots);
  }
  function paint() {
    const element = canvas.current; if (!element) return;
    const bounds = element.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!bounds.width || !bounds.height) return;
    const width = Math.round(bounds.width * dpr), height = Math.round(bounds.height * dpr);
    if (element.width !== width) element.width = width;
    if (element.height !== height) element.height = height;
    const ctx = element.getContext('2d'); if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const palette = getComputedStyle(element);
    const paper = palette.getPropertyValue('--study-paper').trim();
    ctx.scale(dpr, dpr); ctx.fillStyle = paper; ctx.fillRect(0, 0, bounds.width, bounds.height);
    ctx.fillStyle = palette.getPropertyValue('--study-paper-dot').trim(); for (let x = 20; x < bounds.width; x += 24) for (let y = 20; y < bounds.height; y += 24) { ctx.beginPath(); ctx.arc(x, y, .65, 0, Math.PI * 2); ctx.fill(); }
    // Fixed logical paper keeps all ink visible when the work area changes size.
    ctx.scale(bounds.width / 800, bounds.height / 700);
    for (const stroke of strokes()) {
      ctx.strokeStyle = stroke.erase ? paper : palette.getPropertyValue('--study-paper-ink').trim(); ctx.lineWidth = stroke.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); stroke.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      if (stroke.points.length === 1) { const p = stroke.points[0]; ctx.lineTo(p.x + .1, p.y); } ctx.stroke();
    }
  }
  function queuePaint() {
    if (paintFrame.current !== null) return;
    paintFrame.current = requestAnimationFrame(() => { paintFrame.current = null; paint(); });
  }
  useEffect(() => { paint(); const observer = new ResizeObserver(paint); if (canvas.current) observer.observe(canvas.current); const themeObserver = new MutationObserver(paint); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); return () => { observer.disconnect(); themeObserver.disconnect(); if (paintFrame.current !== null) cancelAnimationFrame(paintFrame.current); paintFrame.current = null; active.current = null; activePointer.current = null; }; }, [question, revision]);
  function point(e: PointerEvent<HTMLCanvasElement>) { const bounds = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX - bounds.left) / bounds.width * 800, y: (e.clientY - bounds.top) / bounds.height * 700 }; }
  return <section className="drawing-board" aria-label="Drawing board" hidden={hidden}>
    <header className="tool-heading"><PenLine size={18} /><strong>Working paper</strong><span className="tool-hint">Q{question + 1}</span><button className="icon-button" onClick={onClose} aria-label="Close drawing board"><X size={18} /></button></header>
    <div className="drawing-toolbar"><button className={`icon-button ${!eraser ? 'active' : ''}`} aria-label="Pen" aria-pressed={!eraser} onClick={() => setEraser(false)}><PenLine size={18} /></button><button className={`icon-button ${eraser ? 'active' : ''}`} aria-label="Eraser" aria-pressed={eraser} onClick={() => setEraser(true)}><Eraser size={18} /></button><label>Stroke <select value={size} onChange={e => setSize(Number(e.target.value))}><option value={3}>Fine</option><option value={6}>Medium</option><option value={10}>Bold</option></select></label><button className="icon-button" aria-label="Undo stroke" disabled={!canUndo} onClick={() => { const previous = history.current.get(question)?.pop(); if (previous) notes.current.set(question, previous); update(r => r + 1); }}><Undo2 size={18} /></button><button className="icon-button" aria-label="Clear working paper" disabled={!strokes().length} onClick={() => { checkpoint(); notes.current.set(question, []); update(r => r + 1); }}><Trash2 size={18} /></button></div>
    <canvas ref={canvas} aria-label={`Drawing area for question ${question + 1}`} onPointerDown={e => { e.preventDefault(); if (active.current) return; checkpoint(); activePointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); const stroke = { points: [point(e)], erase: eraser, size: eraser ? 35 : size }; active.current = stroke; const list = strokes(); list.push(stroke); notes.current.set(question, list); paint(); }} onPointerMove={e => { if (active.current && activePointer.current === e.pointerId) { active.current.points.push(point(e)); queuePaint(); } }} onPointerUp={e => { if (activePointer.current !== e.pointerId) return; active.current = null; activePointer.current = null; update(r => r + 1); }} onPointerCancel={e => { if (activePointer.current !== e.pointerId) return; active.current = null; activePointer.current = null; update(r => r + 1); }} />
  </section>;
}

export function StudyWorkspace({ questions, answers, onAnswer, flagged, onFlag, currentQ, onQ, timeLeft, duration, showModal, onModal, onSubmit, nav, practice = false, review = false }: {
  questions: StudyQuestion[]; answers: (number | null)[]; onAnswer: (question: number, option: number) => void;
  flagged: boolean[]; onFlag: (question: number) => void; currentQ: number; onQ: (question: number) => void;
  timeLeft: number; duration: number; showModal: boolean; onModal: (open: boolean) => void; onSubmit: () => void;
  nav: (screen: Destination) => void; practice?: boolean; review?: boolean;
}) {
  const [navigator, setNavigator] = useState(false);
  const [calculator, setCalculator] = useState(false);
  const [board, setBoard] = useState(false);
  const [scale, setScale] = useState(1);
  const [boardWidth, setBoardWidth] = useState(420);
  const [boardHeight, setBoardHeight] = useState(() => Math.min(310, Math.max(150, window.innerHeight * .34)));
  const divider = useRef<{ start: number; dimension: number; mobile: boolean } | null>(null);
  const questionScroll = useRef<HTMLDivElement>(null);
  useEffect(() => { questionScroll.current?.scrollTo({ top: 0 }); }, [currentQ]);
  const question = questions[currentQ];
  const selected = answers[currentQ] ?? null;
  const summary = sessionSummary(questions, answers);
  const reveal = review || (practice && selected !== null);
  const key = question ? answerIndex(question) : null;
  function go(index: number) { onQ(Math.max(0, Math.min(index, questions.length - 1))); }
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      if (e.defaultPrevented || showModal || navigator || calculator || board || (e.target as HTMLElement).closest('input, textarea, select, dialog')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(currentQ + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(currentQ - 1); }
      if (!review && !reveal && /^[1-9]$/.test(e.key) && Number(e.key) <= (question?.options.length || 0)) onAnswer(currentQ, Number(e.key) - 1);
      if (!review && e.key.toLowerCase() === 'f') onFlag(currentQ);
    }
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, [currentQ, review, reveal, question, showModal, navigator, calculator, board, onAnswer, onFlag]);
  if (!question) return <div className="study-app empty-state"><BookOpen size={36} /><h1>No questions available</h1></div>;
  return <main className={`study-app exam-workspace ${board ? 'board-open' : ''}`} style={{ '--board-width': `${boardWidth}px`, '--board-height': `${boardHeight}px`, '--question-scale': scale } as CSSProperties}>
    <header className="exam-header"><span className="wordmark">past<span>q</span><span className="wordmark-rule" /></span><div className="exam-session"><strong>{question.subject}</strong></div>{review ? <button type="button" className="exam-clock exam-complete" onClick={() => nav('results')}><Check size={17} />Complete</button> : <div className={`exam-clock ${timeLeft <= duration * .1 ? 'time-low' : ''}`} role="timer" aria-label="Time remaining"><Clock3 size={17} /><span>{time(timeLeft)}</span></div>}{!review && <button className="study-secondary exam-finish" onClick={() => onModal(true)}>Finish<ArrowRight size={16} /></button>}</header>
    <div className="session-progress" aria-label={`${summary.answered} of ${questions.length} answered`}><div style={{ width: `${summary.answered / questions.length * 100}%` }} /></div>
    <div className="exam-body">
      <aside className="exam-rail"><button className="rail-navigator" aria-label="Open question navigator" onClick={() => setNavigator(true)}><Grid2X2 size={21} /><span>{currentQ + 1}<small>/{questions.length}</small></span><ChevronRight size={15} /></button><div className="rail-line" /><button className={`rail-tool ${calculator ? 'active' : ''}`} aria-label="Open calculator" aria-pressed={calculator} onClick={() => setCalculator(v => !v)}><Calculator size={21} /><span>Calculate</span></button><button className={`rail-tool ${board ? 'active' : ''}`} aria-label="Open drawing board" aria-pressed={board} onClick={() => setBoard(v => !v)}><PenLine size={21} /><span>Work out</span></button></aside>
      <div className="question-column"><div className="question-scroll" ref={questionScroll}><article className="question-paper"><div className="question-meta"><span>QUESTION {String(currentQ + 1).padStart(2, '0')} <small>/ {questions.length}</small></span><div className="question-controls"><button className="icon-button" aria-label="Decrease question text" disabled={scale <= .9} onClick={() => setScale(v => Math.max(.9, v - .1))}><Minus size={15} /><span>A</span></button><button className="icon-button" aria-label="Increase question text" disabled={scale >= 1.4} onClick={() => setScale(v => Math.min(1.4, v + .1))}><Plus size={15} /><span>A</span></button>{!review && <button className={`icon-button flag-button ${flagged[currentQ] ? 'active' : ''}`} aria-label={flagged[currentQ] ? 'Unflag question' : 'Flag question'} aria-pressed={flagged[currentQ]} onClick={() => onFlag(currentQ)}><Flag size={18} /></button>}</div></div>
      <QuestionMedia passage={question.passage} figures={question.figures} />
      <h1 className="question-stem"><MathText text={question.question} /></h1>
      <div className="answer-options" role="group" aria-label="Answer choices">{question.options.map((option, i) => <button key={i} disabled={reveal} aria-pressed={selected === i} className={`answer-option ${selected === i ? 'selected' : ''} ${reveal && key === i ? 'correct-answer' : ''} ${reveal && selected === i && key !== null && key !== i ? 'incorrect-answer' : ''}`} onClick={() => onAnswer(currentQ, i)}><span className="answer-letter">{String.fromCharCode(65 + i)}</span><span className="answer-word"><MathText text={option} /></span>{reveal && key === i ? <Check size={19} /> : reveal && selected === i && key !== null ? <X size={18} /> : selected === i ? <span className="selection-mark" /> : null}{reveal && <span className="answer-state">{key === i ? 'Correct' : selected === i ? 'Your answer' : ''}</span>}</button>)}</div>
      {reveal && <Feedback question={question} selected={selected} />}
      </article></div><footer className="exam-footer"><button className="study-secondary" aria-label="Previous" disabled={currentQ === 0} onClick={() => go(currentQ - 1)}><ArrowLeft size={18} /><span>Previous</span></button><button className="mobile-question-jump" aria-label="Open question navigator" onClick={() => setNavigator(true)}><Grid2X2 size={18} />{currentQ + 1}/{questions.length}</button><button className="study-primary" onClick={() => currentQ < questions.length - 1 ? go(currentQ + 1) : review ? nav('results') : onModal(true)}>{currentQ === questions.length - 1 ? review ? 'Results' : 'Finish exam' : 'Next'}<ArrowRight size={18} /></button></footer></div>
      {board && <><div className="board-divider" role="separator" aria-label="Resize working paper" aria-orientation={window.innerWidth <= 760 ? "horizontal" : "vertical"} aria-valuenow={window.innerWidth <= 760 ? boardHeight : boardWidth} aria-valuemin={window.innerWidth <= 760 ? 150 : 280} aria-valuemax={window.innerWidth <= 760 ? Math.max(150, Math.min(window.innerHeight * .55, window.innerHeight - 300)) : window.innerWidth * .5} tabIndex={0} onPointerDown={e => { const mobile = window.matchMedia('(max-width: 760px)').matches; divider.current = { start: mobile ? e.clientY : e.clientX, dimension: mobile ? boardHeight : boardWidth, mobile }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { const d = divider.current; if (!d) return; if (d.mobile) setBoardHeight(Math.max(150, Math.min(window.innerHeight * .55, window.innerHeight - 300, d.dimension + d.start - e.clientY))); else setBoardWidth(Math.max(280, Math.min(window.innerWidth * .5, d.dimension + d.start - e.clientX))); }} onPointerUp={() => { divider.current = null; }} onPointerCancel={() => { divider.current = null; }} onKeyDown={e => { if (!e.key.startsWith('Arrow')) return; e.preventDefault(); if (window.innerWidth <= 760) setBoardHeight(v => Math.max(150, Math.min(window.innerHeight * .55, window.innerHeight - 300, v + (e.key === 'ArrowUp' ? 20 : -20)))); else setBoardWidth(v => Math.max(280, Math.min(window.innerWidth * .5, v + (e.key === 'ArrowLeft' ? 20 : -20)))); }}><span /></div></>}<DrawingBoard question={currentQ} onClose={() => setBoard(false)} hidden={!board} />
    </div>
    {navigator && <Dialog title={review ? 'Review questions' : 'Your questions'} drawer onClose={() => setNavigator(false)}><p className="navigator-count">{summary.answered} of {questions.length} answered</p><div className="navigator-legend"><span><i className="done" />Answered</span><span><i />Unanswered</span><span><Flag size={13} />Flagged</span></div><div className="question-grid">{questions.map((q, i) => <button key={i} className={`${answers[i] != null ? 'done' : ''} ${i === currentQ ? 'current' : ''}`} aria-current={i === currentQ ? 'step' : undefined} aria-label={`Question ${i + 1}, ${answers[i] != null ? 'answered' : 'unanswered'}${flagged[i] ? ', flagged' : ''}`} onClick={() => { go(i); setNavigator(false); }}>{i + 1}{flagged[i] && <Flag size={10} />}</button>)}</div><div className="navigator-actions"><button className="study-secondary" onClick={() => { const next = answers.findIndex((a, i) => a == null && i > currentQ); const first = answers.findIndex(a => a == null); if (first >= 0) go(next >= 0 ? next : first); setNavigator(false); }} disabled={!summary.skipped}>Next unanswered<ArrowRight size={16} /></button><button className="study-primary" onClick={() => { setNavigator(false); review ? nav('results') : onModal(true); }}>{review ? 'Return to results' : 'Finish exam'}</button></div></Dialog>}
    {showModal && !review && <Dialog title="Ready to finish?" onClose={() => onModal(false)}><p className="dialog-copy">{summary.skipped ? `${summary.skipped} question${summary.skipped === 1 ? ' is' : 's are'} still unanswered.` : 'Every question has an answer.'}</p><div className="finish-counts"><div><strong>{summary.answered}</strong><span>Answered</span></div><div><strong>{summary.skipped}</strong><span>Remaining</span></div><div><strong>{flagged.filter(Boolean).length}</strong><span>Flagged</span></div></div><div className="dialog-actions"><button className="study-primary" onClick={onSubmit}>Submit exam<ArrowRight size={18} /></button><button className="study-secondary" onClick={() => onModal(false)}>Keep working</button></div></Dialog>}
    <FloatingCalculator onClose={() => setCalculator(false)} hidden={!calculator} />
  </main>;
}

export function StudyResults({ questions, answers, timeTaken, nav, onPracticeMissed }: { questions: StudyQuestion[]; answers: (number | null)[]; timeTaken: number; nav: (screen: Destination) => void; onPracticeMissed: () => void }) {
  const summary = sessionSummary(questions, answers);
  const subjects = [...new Set(questions.map(q => q.subject))];
  const missed = questions.some((q, i) => answerIndex(q) !== null && answers[i] !== answerIndex(q));
  return <main className="study-app results-screen"><header className="study-topbar"><span className="wordmark">past<span>q</span><span className="wordmark-rule" /></span></header><div className="results-content"><div className="results-heading"><span className="eyebrow">SESSION COMPLETE</span><h1>{summary.percent === null ? 'Practice, done.' : summary.percent >= 80 ? 'That’s good progress.' : 'Every attempt counts.'}</h1><p>{summary.percent === null ? 'Your answers are saved for review.' : 'Take what you learned into your next session.'}</p></div><section className="score-composition"><div className="score-number"><strong>{summary.percent === null ? '—' : summary.percent}<span>{summary.percent === null ? '' : '%'}</span></strong><p>{summary.graded ? `${summary.correct} of ${summary.graded} graded questions correct` : `${summary.answered} questions practised · ungraded`}</p></div><svg className="progress-art" viewBox="0 0 260 180" fill="none" aria-hidden="true"><path d="M20 156H244" stroke="currentColor" opacity=".25" /><path d="M30 155V132H77V105H124V78H171V51H218V25" stroke="currentColor" strokeWidth="2" /><path d="M32 131H76V154H32zM79 105H123V154H79zM126 78H170V154H126zM173 51H217V154H173z" fill="currentColor" opacity=".06" /><path d="m204 23 15 2-1 15" stroke="var(--study-accent)" strokeWidth="2" /><circle cx="124" cy="78" r="5" fill="var(--study-accent)" /><path d="M30 126C83 111 117 90 150 66S195 35 218 25" stroke="var(--study-accent)" strokeWidth="2" strokeDasharray="3 5" /></svg><div className="result-stats"><div><strong>{summary.correct}</strong><span>Correct</span></div><div><strong>{summary.incorrect}</strong><span>Incorrect</span></div><div><strong>{summary.skipped}</strong><span>Skipped</span></div><div><strong>{time(timeTaken)}</strong><span>Time taken</span></div>{summary.ungraded > 0 && <div><strong>{summary.ungraded}</strong><span>Without key</span></div>}</div><button className="study-secondary result-review" onClick={() => nav('review-answers')}><BookOpen size={18} />Review answers<ArrowRight size={18} /></button></section><div className="results-next"><div><span className="eyebrow">YOUR NEXT STEP</span><h2>{missed ? 'Turn the gaps into gains.' : 'Keep the momentum.'}</h2><p>{missed ? 'A focused practice of the questions to revisit.' : 'Try another session or explore a new subject.'}</p></div><button className="study-primary" onClick={missed ? onPracticeMissed : () => nav('exam')}>{missed ? 'Practice these questions' : 'Practice again'}<ArrowRight size={18} /></button></div><section className="subject-results"><h2>By subject</h2>{subjects.map(subject => { const indexes = questions.map((q, i) => q.subject === subject ? i : -1).filter(i => i >= 0); const stats = sessionSummary(indexes.map(i => questions[i]), indexes.map(i => answers[i])); return <div className="subject-result" key={subject}><span>{subject}</span><div className="subject-track"><i style={{ width: `${stats.percent || 0}%` }} /></div><strong>{stats.correct}/{stats.graded}</strong></div>; })}</section><div className="result-actions"><button className="text-button" onClick={() => nav('exam')}><RotateCcw size={16} />Retake exam</button></div></div></main>;
}
