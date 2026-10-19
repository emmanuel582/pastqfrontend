import { useEffect, useState, type ReactNode } from 'react';
import { learningProgress, nextTopic, type LearningItem } from '../../../services/learningProgress';
import { ArrowRight, BookOpen, Download, Upload } from 'lucide-react';
import ScholarMascot from '../ScholarMascot';
import ExamArtwork from '../ExamArtwork';
import { studyPlan, gradedPercent } from '../../../utils/studyPlan';
import type { PracticeSummary } from '../../../services/practiceHistory';
import ContentSkeleton from '../ContentSkeleton';

export default function StudyHome({ ownerId, name, materials, sessions, onOpen, onLibrary, onUpload, environmentName, children }: { ownerId?:string; name: string; materials: any[]; sessions: PracticeSummary[]; onOpen: (material: any) => void; onLibrary: () => void; onUpload: () => void; environmentName?: string; children?: ReactNode }) {
  const [progress,setProgress]=useState<LearningItem[]>([]),[progressReady,setProgressReady]=useState(!ownerId);
  const progressRevision=sessions.map(session=>session.id+session.completed_at).join('|');
  useEffect(()=>{let active=true;if(ownerId){setProgressReady(false);learningProgress(ownerId).then(value=>{if(active)setProgress(value)}).catch(()=>{}).finally(()=>{if(active)setProgressReady(true)});}return()=>{active=false};},[ownerId,progressRevision]);
  const suggestion=nextTopic(materials,progress);
  const basePlan = studyPlan(materials, sessions), plan={...basePlan,material:suggestion?.material||basePlan.material}, first = name.trim().split(/\s+/)[0] || 'there';
  const scores = sessions.map(gradedPercent).filter((value): value is number => value !== null);
  if(!progressReady)return <ContentSkeleton kind="home" hasSaved={materials.length>0} label="Loading your study plan" fullPage/>;
  return <main className="study-app study-home personal-home">
    <header className="study-topbar"><span className="wordmark">past<span>q</span></span><span className="home-greeting">{environmentName || 'Your study room'}</span></header>
    <div className="home-content"><h1>Hi, {first}.</h1>{children}
      {plan.material ? <>
        <section className="home-next" aria-labelledby="home-next-title"><div className="home-next-copy"><span className="home-next-label">{suggestion?'A topic to revisit':plan.reason}</span><h2 id="home-next-title">{suggestion?.topic || plan.material.title || plan.material.name || 'Your saved paper'}</h2><div className="home-next-meta">{suggestion&&<span>{suggestion.subject} · {suggestion.material.title}</span>}<span><Download size={14} />Ready offline</span><span>{plan.material.questions.length} questions</span>{!suggestion&&plan.percent !== null && <span>Last score {plan.percent}%</span>}</div><button className="study-primary" onClick={() => onOpen(suggestion?{...suggestion.material,suggestion:{subject:suggestion.subject,topic:suggestion.topic,year:suggestion.year,paper:suggestion.paper}}:plan.material)}>Practice<ArrowRight size={17} /></button></div><ScholarMascot state={plan.percent !== null && plan.percent < 75 ? 'encourage' : 'study'} /></section>
        {sessions.length > 0 && <div className="home-evidence" aria-label="Your study activity"><span><strong>{sessions.length}</strong> session{sessions.length === 1 ? '' : 's'} completed</span>{scores.length > 0 && <span><strong>{Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)}%</strong> average</span>}</div>}
        <section className="home-saved" aria-labelledby="home-saved-title"><div className="student-section-heading"><h2 id="home-saved-title">On your device</h2><button className="text-button" onClick={onLibrary}>Library<ArrowRight size={15} /></button></div>{plan.saved.slice(0, 3).map(material => <button className="home-paper" key={material.id} onClick={() => onOpen(material)}><ExamArtwork identity={material} /><span><strong>{material.title || material.name || 'Saved paper'}</strong><small>{material.questions.length} questions</small></span><ArrowRight size={17} /></button>)}</section>
      </> : <section className="home-first" aria-labelledby="home-first-title"><ScholarMascot state="encourage" /><h2 id="home-first-title">Your first paper.</h2><button className="study-primary" onClick={onLibrary}>Find a paper<ArrowRight size={17} /></button><button className="text-button" onClick={onUpload}><Upload size={17} />Add your own material</button></section>}
      {plan.material && <div className="home-links"><button onClick={onLibrary}><BookOpen size={22} /><span><strong>Find another paper</strong></span><ArrowRight size={18} /></button><button onClick={onUpload}><Upload size={22} /><span><strong>Add material</strong></span><ArrowRight size={18} /></button></div>}
    </div>
  </main>;
}
