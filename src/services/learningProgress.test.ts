import {describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({attempts:[] as any[],papers:new Map<string,any>()}));
vi.mock('./practiceArchive',()=>({listAttempts:async()=>state.attempts,readAttempt:async(_owner:string,id:string)=>({paper:state.papers.get(id)})}));
import {learningProgress,nextTopic,questionIdentity} from './learningProgress';
import {buildSubjectSession,defaultSubjectSettings} from '../utils/subjectSession';
import {answerIndex} from '../utils/examSession';
const q=(id:number,topic='Ecology')=>({id,subject:'Biology',topic,year:'2020',question:'Q'+id,options:['A','B'],correct:0});
describe('local evidence and coverage',()=>{
 it('learns actual topics from completed offline papers and keeps source publishers distinct',async()=>{
  state.attempts=[{id:'a',status:'completed',source:{bundleId:'utme'},answers:[1,null],completedAt:'2026-10-18',updatedAt:'2026-10-18'}];state.papers.set('a',{questions:[q(1),q(2,'Cells')]});
  const progress=await learningProgress('ada');expect(progress.map(p=>[p.topic,p.outcome])).toEqual([['Ecology','incorrect'],['Cells','skipped']]);
  expect(nextTopic([{id:'utme',questions:[q(1),q(2,'Cells')]}],progress)?.topic).toBe('Ecology');
  expect(nextTopic([{id:'waec',questions:[q(1)]}],progress)).toBeNull();
 });
 it('offers unseen questions without changing deliberate paper order or a subject year',()=>{
  const pool=Array.from({length:40},(_,index)=>q(index+1)),settings={Biology:{...defaultSubjectSettings(pool),count:'20'}};
  const first=buildSubjectSession(['Biology'],{Biology:pool},settings,false);const seen=new Set(first.map(questionIdentity));
  const next=buildSubjectSession(['Biology'],{Biology:pool},settings,false,seen);expect(next.map(q=>q.id)).toEqual(Array.from({length:20},(_,i)=>i+21));
  expect(buildSubjectSession(['Biology'],{Biology:pool},settings,false).map(q=>q.id)).toEqual(first.map(q=>q.id));expect(next.every(q=>q.year==='2020')).toBe(true);
 });
 it('never auto-marks written/theory work even if a malformed source contains a choice key',()=>{expect(answerIndex({...q(1),type:'theory'})).toBeNull();expect(answerIndex({...q(1),type:'short_answer'})).toBeNull()});
});
