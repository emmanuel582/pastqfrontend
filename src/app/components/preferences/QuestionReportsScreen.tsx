import {useEffect,useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import {listQuestionReports,syncQuestionReports,type QuestionReport} from '../../../services/questionReports';
import ContentSkeleton from '../ContentSkeleton';
const labels={queued:'Waiting for connection',received:'Received',reviewing:'Under review',corrected:'Corrected',no_change:'Reviewed'};
export default function QuestionReportsScreen({owner,onBack,onUpdate}:{owner:string;onBack:()=>void;onUpdate:(id:string)=>void}){
 const [rows,setRows]=useState<QuestionReport[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;listQuestionReports(owner).then(value=>{if(active)setRows(value)});syncQuestionReports(owner).then(()=>listQuestionReports(owner)).then(value=>{if(active)setRows(value)}).catch(()=>{if(active)setError('Showing reports saved on this device.')});return()=>{active=false};},[owner]);
 return <main className="study-app library-screen archive-screen archive-bookmarks-screen"><header className="study-topbar archive-topbar"><button className="icon-button" aria-label="Back to Preferences" onClick={onBack}><ArrowLeft size={20}/></button><h1>Question reports</h1></header><div className="library-content archive-content">{rows?rows.map(row=><article className="question-report" key={row.id}><div><strong>{row.subject}{row.year?` · ${row.year}`:''}</strong><span>{labels[row.status]}</span></div>{row.note&&<p>{row.note}</p>}{row.resolution&&<p>{row.resolution}</p>}{row.status==='corrected'&&<button className="text-button" onClick={()=>onUpdate(row.bundleId)}>Update saved material</button>}</article>):<ContentSkeleton kind="history"/>}{rows?.length===0&&<div className="library-empty"><h3>No reports yet.</h3></div>}{error&&<p className="student-setting-note">{error}</p>}</div></main>
}
