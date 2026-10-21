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
async function render(){await act(async()=>root.render(<CustomizeCbtScreen bundle={bundle} ownerId="student" onProceed={vi.fn()} />));}
async function click(name:string){const el=[...host.querySelectorAll<HTMLButtonElement>('button')].find(el=>el.getAttribute('aria-label')===name||el.textContent===name)!;expect(el).toBeTruthy();await act(async()=>el.click());}
function active(){return host.querySelector('.builder-steps [aria-current="step"]')?.getAttribute('aria-label');}
it('shows Subjects while editing from Review and keeps the edited selection when switching steps',async()=>{
 await render();expect(host.textContent).not.toContain('Search & coverage');
 await click('Review');expect(active()).toBe('Review');
 await click('Revise Biology');expect(active()).toBe('Subjects');
 const select=host.querySelector<HTMLSelectElement>('select[aria-label="Questions for Biology"]')!;
 await act(async()=>{select.value='10';select.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(host.querySelector('.builder-steps')?.textContent).toContain('10 questions');
 await click('Session');expect(active()).toBe('Session');
 const input=host.querySelector<HTMLInputElement>('input[aria-label="Time limit in minutes"]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'35');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await click('Subjects');expect(host.textContent).toContain('10 questions');
 await click('Review');expect(active()).toBe('Review');expect(host.textContent).toContain('35 min');
 expect(JSON.parse(localStorage.getItem('pastq-session:student:biology')!).settings.Biology.count).toBe('10');
});
it('returns from a subject edit to Review without losing the active indicator',async()=>{
 await render();await click('Review');await click('Revise Biology');expect(active()).toBe('Subjects');
 await click('Done');expect(active()).toBe('Review');expect(host.querySelector('[aria-label="Review session"]')).not.toBeNull();
});
