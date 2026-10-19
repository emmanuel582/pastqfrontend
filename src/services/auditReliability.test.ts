import {beforeEach,describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({stores:new Map<string,Map<string,any>>(),owner:'ada',commits:0}));
vi.mock('localforage',()=>({default:{createInstance:({storeName}:{storeName:string})=>{if(!state.stores.has(storeName))state.stores.set(storeName,new Map());const map=()=>state.stores.get(storeName)!;return {getItem:async(key:string)=>map().get(key)??null,setItem:async(key:string,value:any)=>{map().set(key,structuredClone(value));return value},removeItem:async(key:string)=>{map().delete(key)},iterate:async(fn:any)=>{for(const [key,value]of map())fn(value,key)}}}}}));
vi.mock('./supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:state.owner},access_token:'token'}}})}}}));
vi.mock('./practiceHistory',()=>({readPracticeHistory:async()=>[],rememberPractice:vi.fn()}));
vi.mock('./practiceArchive',()=>({listAttempts:async()=>[],readAttempt:vi.fn(),listBookmarks:async()=>[]}));
import {sha256,downloadSelected,imageReferences,savedDownloadSelection,formatBytes} from './downloads';
import {validateStudyBackup,importStudyBackup} from './studyBackup';
const question={id:'q',subject:'Biology',question:'Cell?',options:['A','B'],correct:0,explanation:''};
beforeEach(()=>{for(const map of state.stores.values())map.clear();state.commits=0;vi.unstubAllGlobals();});
describe('audited offline download and restore guarantees',()=>{
 it('preserves downloaded paper and chunk choices across a corrected version',()=>{
  const parts=[{hash:'new',subject:'Biology',year:'2020',paper:'2020',count:40,bytes:100,offset:0},{hash:'next',subject:'Biology',year:'2021',paper:'2021',count:40,bytes:100,offset:0}];
  const manifest={version:'v2',bundle:{id:'bank'},parts,totalQuestions:80,totalBytes:200};
  expect(savedDownloadSelection(manifest,{partialDownload:true,downloadedSelection:[{...parts[0],hash:'old'}]})).toEqual(['new']);
  expect(formatBytes(0)).toBe('0 B');
 });
 it('resumes verified missing parts and commits only after every part succeeds',async()=>{
  const bodies=[JSON.stringify({questions:[question],assets:{}}),JSON.stringify({questions:[{...question,id:'q2'}],assets:{}})];
  const parts=await Promise.all(bodies.map(async(text,index)=>({hash:await sha256(text),subject:'Biology',paper:'2020',year:'2020',count:1,bytes:text.length,offset:index})));
  const manifest={version:'v1',bundle:{id:'bank',title:'Biology'},parts,totalQuestions:2,totalBytes:bodies.join('').length};
  let fail=true;const fetched:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>{const hash=url.split('/').at(-1)!;fetched.push(hash);const index=parts.findIndex(p=>p.hash===hash);if(index===1&&fail)throw new Error('Disconnected');return new Response(bodies[index])}));
  const commit=vi.fn(async bundle=>{state.commits++;return bundle});
  await expect(downloadSelected(manifest,parts.map(p=>p.hash),commit)).rejects.toThrow('Disconnected');expect(commit).not.toHaveBeenCalled();
  fail=false;const bundle=await downloadSelected(manifest,parts.map(p=>p.hash),commit);
  expect(bundle.questions).toHaveLength(2);expect(fetched.filter(hash=>hash===parts[0].hash)).toHaveLength(1);expect(commit).toHaveBeenCalledOnce();
 });
 it('rejects altered transfer bytes and respects pause before overwriting a working copy',async()=>{
  const text=JSON.stringify({questions:[question],assets:{}}),hash=await sha256(text),part={hash,subject:'Biology',year:'',paper:'',count:1,bytes:text.length,offset:0};
  const manifest={version:'v1',bundle:{id:'bank'},parts:[part],totalQuestions:1,totalBytes:text.length};const commit=vi.fn();
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(text+' ')));await expect(downloadSelected(manifest,[hash],commit)).rejects.toThrow('verification');expect(commit).not.toHaveBeenCalled();
  const controller=new AbortController();controller.abort();await expect(downloadSelected(manifest,[hash],commit,{signal:controller.signal})).rejects.toThrow();expect(commit).not.toHaveBeenCalled();
 });
 it('counts diagram placements across answers, explanations, options and passages',()=>{const src='pastq-asset:'+'a'.repeat(64);expect(imageReferences([{questionHtml:src,optionsHtml:[src],answerHtml:src,explanationHtml:src,passage:src},{}])).toBe(5)});
 it('requires the same account and rejects truncated backup papers before importing anything',()=>{
  const raw={format:'pastq-study-backup',version:1,owner:'ada',attempts:[],papers:[],bookmarks:[],history:[]};expect(()=>validateStudyBackup(raw,'ben')).toThrow('another account');
  const attempt={id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',owner:'ada',source:{bundleId:'bank'},status:'completed',startedAt:new Date().toISOString(),duration:60,deadline:Date.now(),currentQ:0,questionCount:2,writer:'writer',answers:[0],flagged:[false],writtenAnswers:['']};
  expect(()=>validateStudyBackup({...raw,attempts:[attempt],papers:[{id:attempt.id,paper:{questions:[question]}}]},'ada')).toThrow('incomplete');
 });
 it('restores notes and bookmarks without overwriting newer local edits',async()=>{
  const bookmark={key:'saved',owner:'ada',source:{bundleId:'bank'},question,assets:{},answer:0,note:'original note',createdAt:new Date().toISOString()};
  const raw={format:'pastq-study-backup',version:1,owner:'ada',attempts:[],papers:[],bookmarks:[bookmark],history:[]};
  const file={size:100,text:async()=>JSON.stringify(raw)} as File;
  await importStudyBackup('ada',file);expect(state.stores.get('question_bookmarks')?.get('ada:saved').note).toBe('original note');
  state.stores.get('question_bookmarks')!.get('ada:saved').note='newer note';await importStudyBackup('ada',file);expect(state.stores.get('question_bookmarks')!.get('ada:saved').note).toBe('newer note');
 });
});
