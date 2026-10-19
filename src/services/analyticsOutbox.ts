import localforage from 'localforage';
import { supabase } from './supabase';
import { savePracticeResult } from './db';
const queue=localforage.createInstance({name:'PastQStudent',storeName:'analytics_outbox'});
const synced=localforage.createInstance({name:'PastQStudent',storeName:'analytics_synced'});
const locks=new Map<string,Promise<void>>();
export async function queueAnalytics(input: Parameters<typeof savePracticeResult>[0]) {
  const key=input.userId+':'+input.id;
  if (!await synced.getItem(key)) await queue.setItem(key,input);
}
export async function analyticsSynced(owner:string,id:string) {return Boolean(await synced.getItem(owner+':'+id));}
export function syncAnalytics(owner:string) {
  if (locks.has(owner)) return locks.get(owner)!;
  const run=async()=>{
    if (!navigator.onLine) return;
    const session=await supabase.auth.getSession();if(session.data.session?.user.id!==owner)return;
    const rows:any[]=[];await queue.iterate((value,key)=>{if(key.startsWith(owner+':'))rows.push({key,value})});
    for(const {key,value} of rows){
      const current=await supabase.auth.getSession();if(current.data.session?.user.id!==owner)return;
      await savePracticeResult(value);await synced.setItem(key,true);await queue.removeItem(key);
    }
  };
  const task=(navigator.locks?navigator.locks.request('pastq-analytics:'+owner,run):run()).finally(()=>locks.delete(owner));locks.set(owner,task);return task;
}
