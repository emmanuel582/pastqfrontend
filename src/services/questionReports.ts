import localforage from 'localforage';
import {supabase} from './supabase';
import {apiUrl} from './api';
export type QuestionReport={id:string;owner:string;bundleId:string;questionId:string;version:string|null;category:string;note:string;status:'queued'|'received'|'reviewing'|'corrected'|'no_change';createdAt:string;updatedAt?:string;subject:string;year?:string;resolution?:string;correctedVersion?:string|null};
const storage=localforage.createInstance({name:'PastQStudent',storeName:'question_reports'}),running=new Map<string,Promise<void>>();
async function request(owner:string,path:string,body?:any){
 const {data}=await supabase.auth.getSession();if(data.session?.user.id!==owner)throw new Error('Sign in to sync your reports.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(apiUrl('/api/question-reports'+path),{method:body?'POST':'GET',signal:controller.signal,headers:{Authorization:`Bearer ${data.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw new Error('Your report is saved on this device and will retry when connected.');return await response.json();}finally{clearTimeout(timer)}
}
export async function listQuestionReports(owner:string){const rows:QuestionReport[]=[];await storage.iterate((row:any,key)=>{if(key.startsWith(owner+':')&&row.owner===owner)rows.push(row)});return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export async function queueQuestionReport(owner:string,input:Omit<QuestionReport,'id'|'owner'|'createdAt'|'status'>){if(!owner)throw new Error('Sign in to report a question.');const row={...input,version:input.version==null?null:String(input.version),id:crypto.randomUUID(),owner,status:'queued' as const,createdAt:new Date().toISOString()};await storage.setItem(owner+':'+row.id,row);return row;}
export function syncQuestionReports(owner:string){
 if(running.has(owner))return running.get(owner)!;
 const task=(async()=>{if(!navigator.onLine)return;for(const row of await listQuestionReports(owner))if(row.status==='queued'){const {owner:_owner,...input}=row;const remote=await request(owner,'',input);if(!remote?.id)throw new Error('Invalid report response');await storage.setItem(owner+':'+row.id,{...row,...remote,owner});}const remote=await request(owner,'');if(Array.isArray(remote.items))for(const row of remote.items)await storage.setItem(owner+':'+row.id,{...row,owner});})().finally(()=>running.delete(owner));running.set(owner,task);return task;
}
