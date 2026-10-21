// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../../services/learningProgress', () => ({ learningProgress: async () => [], questionIdentity: (q: any) => q.id }));
vi.mock('../ScholarMascot', () => ({ default: () => null }));
import { CustomizeCbtScreen } from './CustomizeCbtScreen';
const bundle={id:'biology',title:'Biology papers',questions:Array.from({length:30},(_,i)=>({id:String(i),subject:'Biology',year:'2020',question:'A question',options:['A','B','C','D'],correct:0}))};
let host: HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollTo=vi.fn();localStorage.clear();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function render(onProceed=vi.fn(),material=bundle){await act(async()=>root.render(<CustomizeCbtScreen bundle={material} ownerId="student" onProceed={onProceed} />));}
async function fill(name:string,value:string){const input=host.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`)!;expect(input).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
async function click(name:string){const el=[...host.querySelectorAll<HTMLButtonElement>('button')].find(el=>el.getAttribute('aria-label')===name||el.textContent===name)!;expect(el).toBeTruthy();await act(async()=>el.click());}
function active(){return host.querySelector('.builder-steps [aria-current="step"]')?.getAttribute('aria-label');}
it('shows Subjects while editing from Review and keeps the edited selection when switching steps',async()=>{
 await render();expect(host.textContent).not.toContain('Search & coverage');
 await click('Review');expect(active()).toBe('Review');
 await click('Revise Biology');expect(active()).toBe('Subjects');
 await fill('Questions for Biology','17');
 expect(host.querySelector('.builder-steps')?.textContent).toContain('17 questions');
 await click('Session');expect(active()).toBe('Session');
 await fill('Time limit hours','1');await fill('Time limit minutes','35');
 await click('Exam');await click('Practice');
 await click('Subjects');expect(host.textContent).toContain('17 questions');
 await click('Review');expect(active()).toBe('Review');expect(host.textContent).toContain('1h 35m');
 expect(JSON.parse(localStorage.getItem('pastq-session:student:biology')!).settings.Biology.count).toBe('17');
});
it('starts with the exact custom duration and count and blocks invalid values',async()=>{
 const proceed=vi.fn();await render(proceed);await click('Edit Biology');await fill('Questions for Biology','31');
 expect(host.querySelector<HTMLButtonElement>('.builder-footer button')!.disabled).toBe(true);
 await fill('Questions for Biology','17');await click('Done');await click('Session');
 await fill('Time limit hours','0');await fill('Time limit minutes','0');expect(host.querySelector<HTMLButtonElement>('.builder-footer button')!.disabled).toBe(true);
 await fill('Time limit hours','1');await fill('Time limit minutes','60');expect(host.querySelector<HTMLButtonElement>('.builder-footer button')!.disabled).toBe(true);
 await fill('Time limit minutes','35');await click('Review');await click('Start session');
 expect(proceed).toHaveBeenCalledWith(expect.objectContaining({durationSeconds:5700,questions:expect.any(Array)}));expect(proceed.mock.calls[0][0].questions).toHaveLength(17);
});
it('restores minute-only drafts and lets the student choose every available question',async()=>{
 localStorage.setItem('pastq-session:student:biology',JSON.stringify({duration:'95'}));await render();await click('Session');
 expect(host.querySelector<HTMLInputElement>('[aria-label="Time limit hours"]')!.value).toBe('1');expect(host.querySelector<HTMLInputElement>('[aria-label="Time limit minutes"]')!.value).toBe('35');
 await click('Subjects');await click('Edit Biology');await click('All available');await click('Done');expect(host.textContent).toContain('30 questions');
});
it('lets a student customize the timer and counts after choosing the UTME mock preset',async()=>{
 const material={...bundle,examType:'UTME',questions:['Use of English','Biology','Chemistry','Physics'].flatMap(subject=>Array.from({length:subject==='Use of English'?60:40},(_,i)=>({...bundle.questions[0],id:subject+i,subject})))};
 await render(vi.fn(),material);await click('UTME mock');await click('Session');
 expect(host.querySelector<HTMLInputElement>('[aria-label="Time limit hours"]')!.disabled).toBe(false);
 await fill('Time limit minutes','15');await click('Subjects');
 expect([...host.querySelectorAll('button')].find(button=>button.textContent==='Custom')!.getAttribute('aria-pressed')).toBe('true');
 await click('Edit Use of English');await fill('Questions for Use of English','23');await click('Done');await click('Review');
 expect(host.textContent).toContain('2h 15m');expect(host.textContent).toContain('143 questions');
});
it('returns from a subject edit to Review without losing the active indicator',async()=>{
 await render();await click('Review');await click('Revise Biology');expect(active()).toBe('Subjects');
 await click('Done');expect(active()).toBe('Review');expect(host.querySelector('[aria-label="Review session"]')).not.toBeNull();
});
