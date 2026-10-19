// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('../../../services/learningProgress',()=>({learningProgress:async()=>[],questionIdentity:(q:any)=>String(q.id)}));
import {CustomizeCbtScreen} from './CustomizeCbtScreen';
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();host=document.createElement('div');document.body.append(host);root=createRoot(host);HTMLElement.prototype.scrollTo=vi.fn()});
afterEach(async()=>{await act(async()=>root.unmount());host.remove()});
async function click(label:string){const button=[...host.querySelectorAll('button')].find(b=>b.textContent===label||b.getAttribute('aria-label')===label);expect(button).toBeTruthy();await act(async()=>button!.click())}
const bank=(englishCount=60)=>({id:'utme',kind:'utme-bank',title:'UTME',questions:['English','Biology','Chemistry','Physics'].flatMap(subject=>Array.from({length:subject==='English'?englishCount:40},(_,index)=>({id:subject+index,subject,year:'2020',question:'Source question',options:['A','B','C','D'],correct:0})))}) as any;
describe('verified UTME preset',()=>{
 it('uses exactly English 60 plus three subjects of 40 in 120 minutes',async()=>{const proceed=vi.fn();await act(async()=>root.render(<CustomizeCbtScreen bundle={bank()} onProceed={proceed}/>));await click('UTME mock');await click('Session');await click('Exam');await click('Review');await click('Start session');expect(proceed).toHaveBeenCalledOnce();const input=proceed.mock.calls[0][0];expect(input.durationSeconds).toBe(7200);expect(input.questions).toHaveLength(180);expect(input.questions.filter((q:any)=>q.subject==='English')).toHaveLength(60);expect(input.questions.every((q:any)=>q.year==='2020')).toBe(true);});
 it('does not silently pass a short paper as a full mock',async()=>{await act(async()=>root.render(<CustomizeCbtScreen bundle={bank(40)} onProceed={vi.fn()}/>));await click('UTME mock');expect(host.textContent).toContain('at least 60 questions for English');await click('Review');expect([...host.querySelectorAll('button')].find(b=>b.textContent?.startsWith('Start session'))?.disabled).toBe(true);});
});
