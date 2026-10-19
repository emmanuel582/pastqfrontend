import localforage from 'localforage';
import {validateDownloadedBundle} from './downloads';
import { listAttempts, readAttempt, listBookmarks } from './practiceArchive';
import { readPracticeHistory, rememberPractice } from './practiceHistory';
const stores = Object.fromEntries(['practice_attempts','practice_papers','question_bookmarks'].map(storeName=>[storeName,localforage.createInstance({name:'PastQStudent',storeName})]));
const imports=localforage.createInstance({name:'PastQStudent',storeName:'backup_imports'});
const uuid=/^[a-f0-9-]{36}$/i;
export async function exportStudyBackup(owner:string) {
  if (!owner) throw new Error('Sign in before creating a backup.');
  const attempts=await listAttempts(owner), papers=[];
  for(const attempt of attempts){const {paper}=await readAttempt(owner,attempt.id);papers.push({id:attempt.id,paper});}
  const body=JSON.stringify({format:'pastq-study-backup',version:1,owner,createdAt:new Date().toISOString(),attempts,papers,bookmarks:await listBookmarks(owner),history:await readPracticeHistory(owner)});
  return new Blob([body],{type:'application/json'});
}
export function validateStudyBackup(raw:any,owner:string) {
  if(raw?.format!=='pastq-study-backup'||raw.version!==1||raw.owner!==owner||!owner)throw new Error('This backup belongs to another account or uses an unsupported format.');
  if(!Array.isArray(raw.attempts)||!Array.isArray(raw.papers)||!Array.isArray(raw.bookmarks)||!Array.isArray(raw.history)||raw.attempts.length>10000||raw.bookmarks.length>20000)throw new Error('Invalid backup.');
  const ids=new Set<string>();
  for(const a of raw.attempts){
    const paper=raw.papers.find((p:any)=>p.id===a.id)?.paper;
    if(!uuid.test(a.id)||ids.has(a.id)||a.owner!==owner||!['active','completed'].includes(a.status)||!Number.isFinite(Date.parse(a.startedAt))||!Number.isFinite(a.duration)||a.duration<=0||!Number.isFinite(a.deadline)||!Number.isInteger(a.currentQ)||a.currentQ<0||a.currentQ>=a.questionCount||typeof a.source?.bundleId!=='string'||typeof a.writer!=='string'||!Array.isArray(a.answers)||!Array.isArray(a.flagged)||!Array.isArray(a.writtenAnswers)||!paper||!Array.isArray(paper.questions)||paper.questions.length!==a.questionCount||a.answers.length!==a.questionCount||a.flagged.length!==a.questionCount||a.writtenAnswers.length!==a.questionCount||a.flagged.some((flag:any)=>typeof flag!=='boolean')||a.writtenAnswers.some((text:any)=>typeof text!=='string')||paper.questions.some((q:any)=>typeof q?.question!=='string'||typeof q.subject!=='string'||!Array.isArray(q.options)||q.options.some((option:any)=>typeof option!=='string')))throw new Error('The backup contains an incomplete session.');
    ids.add(a.id);
  }
  for(const row of raw.bookmarks) if(row.owner!==owner||typeof row.key!=='string'||!row.question?.subject||typeof row.question.question!=='string'||!Array.isArray(row.question.options)||typeof row.source?.bundleId!=='string')throw new Error('The backup contains an invalid saved question.');
  return raw;
}
export async function importStudyBackup(owner:string,file:File) {
  if(file.size>200*1024*1024)throw new Error('This backup is too large. Use a file below 200 MB.');
  const raw=validateStudyBackup(JSON.parse(await file.text()),owner);
  for(const {paper} of raw.papers)await validateDownloadedBundle({...paper,id:'backup-paper',sourceAudit:undefined});
  for(const row of raw.bookmarks)await validateDownloadedBundle({id:'backup-bookmark',questions:[row.question],assets:row.assets||{}});
  // A validated staging copy survives quota failures. Existing work is never overwritten.
  await imports.setItem(owner,raw);
  for(const a of raw.attempts){const key=encodeURIComponent(owner)+':'+a.id;if(await stores.practice_attempts.getItem(key))continue;const {paper}=raw.papers.find((p:any)=>p.id===a.id);await stores.practice_papers.setItem(key,paper);await stores.practice_attempts.setItem(key,a);}
  for(const row of raw.bookmarks){const key=encodeURIComponent(owner)+':'+row.key;if(!await stores.question_bookmarks.getItem(key))await stores.question_bookmarks.setItem(key,row);}
  const known=new Set((await readPracticeHistory(owner)).map(row=>row.id));for(const row of raw.history)if(!known.has(row.id))await rememberPractice(owner,{...row,pending:true});
  await imports.removeItem(owner);return {sessions:raw.attempts.length,bookmarks:raw.bookmarks.length};
}
