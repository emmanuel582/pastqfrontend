import localforage from 'localforage';
import { apiUrl } from './api';
import { bundleNeedsImageRepair } from '../utils/bundleMedia';
export type DownloadPart={hash:string;subject:string;year:string;paper:string;count:number;bytes:number;offset:number;part?:number};
export type DownloadManifest={version:string;bundle:any;parts:DownloadPart[];totalQuestions:number;totalBytes:number};
const staged=localforage.createInstance({name:'PastQLibrary',storeName:'download_parts'});
export const formatBytes=(bytes:number)=>bytes<=0?'0 B':bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;
export function savedDownloadSelection(manifest:DownloadManifest,saved:any){
  if(!saved?.partialDownload)return manifest.parts.map(part=>part.hash);
  const hashes=new Set(saved.downloadedParts||[]);
  const groups=new Set((saved.questions||[]).map((q:any)=>JSON.stringify([q.subject,String(q.year||''),q.sourceSet||q.paper||''])));
  return manifest.parts.filter(part=>hashes.has(part.hash)||(saved.downloadedSelection?.length
    ?saved.downloadedSelection.some((old:DownloadPart)=>old.subject===part.subject&&old.year===part.year&&old.paper===part.paper&&old.offset<part.offset+part.count&&part.offset<old.offset+old.count)
    :groups.has(JSON.stringify([part.subject,part.year,part.paper])))).map(part=>part.hash);
}
export async function downloadManifest(id:string,signal?:AbortSignal):Promise<DownloadManifest>{
  const response=await fetch(apiUrl(`/api/library/bundles/${encodeURIComponent(id)}/manifest`),{signal,cache:'no-cache'});
  if(!response.ok)throw new Error('Download details could not load. Reconnect and try again.');
  const value=await response.json();
  if(!Array.isArray(value.parts)||!value.parts.length||value.parts.some((p:any)=>!/^[a-f0-9]{64}$/.test(p.hash)||!Number.isSafeInteger(p.bytes)||p.bytes<=0||!Number.isSafeInteger(p.count)||p.count<=0)||value.bundle?.id!==id||value.parts.reduce((n:number,p:DownloadPart)=>n+p.count,0)!==value.totalQuestions||value.parts.reduce((n:number,p:DownloadPart)=>n+p.bytes,0)!==value.totalBytes)throw new Error('Invalid download details.');
  return value;
}
export async function sha256(text:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function imageReferences(questions:any[]){return questions.reduce((n,q)=>n+([q.questionHtml,...(q.optionsHtml||[]),q.answerHtml,q.explanationHtml,q.passage].join(' ').match(/pastq-asset:[a-f0-9]{64}/g)?.length||0),0);}
export async function validateDownloadedBundle(bundle:any){
  if(!Array.isArray(bundle.questions)||!bundle.questions.length||bundleNeedsImageRepair(bundle))throw new Error('This download is incomplete. Your previous saved copy is unchanged.');
  for(const q of bundle.questions)if(!q||typeof q.subject!=='string'||typeof q.question!=='string'||!Array.isArray(q.options))throw new Error('Invalid question data.');
  for(const asset of Object.values(bundle.assets||{}) as {mime:string;data:string}[]){
    if(!/^image\/(png|jpeg|webp|gif)$/.test(asset.mime)||typeof asset.data!=='string')throw new Error('Invalid diagram data.');
    const raw=atob(asset.data.replace(/\s/g,''));
    if(raw.length<12)throw new Error('A diagram is incomplete.');
    if(typeof createImageBitmap==='function'){const image=await createImageBitmap(new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],{type:asset.mime}));if(!image.width||!image.height)throw new Error('A diagram could not decode.');image.close();}
  }
  return bundle;
}
export async function downloadSelected(manifest:DownloadManifest,selected:string[],commit:(bundle:any)=>Promise<any>,options:{signal?:AbortSignal;onProgress?:(done:number,total:number)=>void}={}){
  const parts=manifest.parts.filter(p=>selected.includes(p.hash));if(!parts.length)throw new Error('Choose a subject or paper.');
  const questions:any[]=[],assets:Record<string,any>={};const total=parts.reduce((n,p)=>n+p.bytes,0);let done=0;
  for(const part of parts){
    options.signal?.throwIfAborted();const key=manifest.bundle.id+':'+part.hash;
    let text=await staged.getItem<string>(key);
    if(!text||await sha256(text)!==part.hash){
      const response=await fetch(apiUrl(`/api/library/bundles/${encodeURIComponent(manifest.bundle.id)}/parts/${part.hash}`),{signal:options.signal});if(!response.ok)throw new Error('Download interrupted. Reconnect and tap Resume.');
      if(response.body){const reader=response.body.getReader(),decoder=new TextDecoder();let received=0;const chunks:string[]=[];for(;;){const result=await reader.read();if(result.done)break;received+=result.value.byteLength;chunks.push(decoder.decode(result.value,{stream:true}));options.onProgress?.(done+Math.min(received,part.bytes),total);}chunks.push(decoder.decode());text=chunks.join('');}else text=await response.text();
      if(await sha256(text)!==part.hash)throw new Error('A download part failed verification. Resume to retry.');
      const payload=JSON.parse(text);if(payload.questions?.length!==part.count)throw new Error('A download part is incomplete.');
      await validateDownloadedBundle({...manifest.bundle,id:'part',questions:payload.questions,assets:payload.assets,sourceAudit:undefined});
      await staged.setItem(key,text);
    }
    const payload=JSON.parse(text);questions.push(...payload.questions);Object.assign(assets,payload.assets);done+=part.bytes;options.onProgress?.(done,total);
  }
  const bundle={...manifest.bundle,questions,assets,question_count:questions.length,updatedAt:manifest.version,downloadedAt:new Date().toISOString(),downloadedParts:parts.map(p=>p.hash),downloadedSelection:parts,downloadBytes:done,originalSourceAudit:manifest.bundle.sourceAudit,sourceAudit:{...manifest.bundle.sourceAudit,questions:questions.length,imageReferences:imageReferences(questions)},partialDownload:parts.length!==manifest.parts.length};
  await validateDownloadedBundle(bundle);options.signal?.throwIfAborted();return commit(bundle);
}
export async function clearDownloadParts(id?:string){const keys:string[]=[];await staged.iterate((_value,key)=>{if(!id||key.startsWith(id+':'))keys.push(key)});for(const key of keys)await staged.removeItem(key);}
export async function stagedDownloadBytes(){let bytes=0;await staged.iterate(value=>{if(typeof value==='string')bytes+=new Blob([value]).size});return bytes;}
