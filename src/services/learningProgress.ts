import { listAttempts, readAttempt, type SavedQuestion } from './practiceArchive';
import { answerIndex } from '../utils/examSession';
import { topicOf } from '../utils/cbtFilters';
import localforage from 'localforage';
const evidence=localforage.createInstance({name:'PastQStudent',storeName:'learning_evidence'});

export const questionIdentity = (q: any) => JSON.stringify([q.id ?? q.questionNumber ?? q.question, q.subject, q.year || '', q.sourceSet || q.paper || '']);
export type LearningItem = { key: string; bundleId: string; subject: string; topic: string | null; year:string; paper:string; outcome: 'correct' | 'incorrect' | 'skipped' | 'reviewed'; at: string };
export async function learningProgress(owner: string, bundleId?: string): Promise<LearningItem[]> {
  if (!owner) return [];
  const items = new Map<string, LearningItem>();
  const attempts = (await listAttempts(owner)).filter(a => a.status === 'completed').reverse();
  for (const attempt of attempts) {
    try {
      const cacheKey=owner+':'+attempt.id;
      const cached=await evidence.getItem<{at:string;rows:LearningItem[]}>(cacheKey).catch(()=>null);
      if(cached?.at===attempt.updatedAt){for(const row of cached.rows)items.set(row.bundleId+row.key,row);continue;}
      const {paper}=await readAttempt(owner,attempt.id);
      const rows:LearningItem[]=[];
      paper.questions.forEach((q,index)=>{
        const key=questionIdentity(q), bundleId=q.sourceBundleId||attempt.source.bundleId, answer=attempt.answers[index], correct=answerIndex(q);
        const row:LearningItem={key,bundleId,subject:q.subject,topic:topicOf(q),year:String(q.year||''),paper:String(q.sourceSet||q.paper||''),at:attempt.completedAt||attempt.updatedAt,outcome:answer==null?'skipped':correct==null?'reviewed':answer===correct?'correct':'incorrect'};
        rows.push(row);items.set(bundleId+key,row);
      });
      await evidence.setItem(cacheKey,{at:attempt.updatedAt,rows}).catch(()=>{});
    } catch { /* A damaged paper is not learning evidence. Its history remains available. */ }
  }
  return [...items.values()].filter(row=>!bundleId||row.bundleId===bundleId);
}
export function nextTopic(materials: any[], progress: LearningItem[]) {
  const groups = new Map<string, { material:any; subject:string; topic:string; correct:number; total:number; at:string;year:string;paper:string }>();
  for (const item of progress) {
    const material=materials.find(m=>m.id===item.bundleId);
    if (!material || !item.topic || item.outcome==='reviewed' || !material.questions.some((q:SavedQuestion)=>q.subject===item.subject && topicOf(q)===item.topic)) continue;
    const key=JSON.stringify([item.bundleId,item.subject,item.topic]);
    const group=groups.get(key)||{material,subject:item.subject,topic:item.topic,correct:0,total:0,at:item.at,year:item.year,paper:item.paper};
    if(item.outcome!=='correct'){group.year=item.year;group.paper=item.paper;}
    group.total++;if(item.outcome==='correct')group.correct++;if(item.at>group.at)group.at=item.at;groups.set(key,group);
  }
  return [...groups.values()].filter(g=>g.correct<g.total).sort((a,b)=>a.correct/a.total-b.correct/b.total||a.at.localeCompare(b.at))[0] || null;
}
