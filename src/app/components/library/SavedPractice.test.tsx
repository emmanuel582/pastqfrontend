// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { StudyProgress } from './StudyLibrary';
import SavedQuestionsScreen from './SavedQuestionsScreen';
import { StudyWorkspace } from '../cbt/StudyWorkspace';
const question = { subject:'Biology', year:'2020', question:'Identify the cell.', options:['Plant','Animal'], correct:0, explanation:'Cell wall.' };
const completed = {id:'saved',title:'UTME Biology',status:'completed',owner:'ada',questionCount:1,answers:[1],source:{bundleId:'utme',version:'v1'}} as any;
let host:HTMLDivElement, root:ReturnType<typeof createRoot>;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});HTMLElement.prototype.scrollTo=vi.fn(); });
afterEach(async () => { await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals(); });
async function click(button:Element|null){expect(button).not.toBeNull();await act(async()=>{(button as HTMLButtonElement).click()});}
describe('saved practice navigation',()=>{
 it('opens saved corrections but never pretends a legacy score contains answers',async()=>{
  const review=vi.fn(),back=vi.fn();await act(async()=>root.render(<StudyProgress sessions={[{id:'saved',title:'UTME Biology',score:0,total_questions:1},{id:'legacy',title:'Old result',score:1,total_questions:1}]} attempts={[completed]} onReview={review} onStart={()=>{}} onBack={back} />));
  expect(host.querySelector('header h1')?.textContent).toBe('Past sessions');expect(host.querySelectorAll('h1')).toHaveLength(1);expect(host.querySelector('.wordmark')).toBeNull();
  await click(host.querySelector('[aria-label="Back to Preferences"]'));expect(back).toHaveBeenCalledOnce();
  expect(host.querySelectorAll('.archive-review')).toHaveLength(1);expect(host.textContent).toContain('Score only');await click(host.querySelector('.archive-review'));expect(review).toHaveBeenCalledWith('saved');
 });
 it('opens a saved question and removes only its own bookmark',async()=>{
  const open=vi.fn(),remove=vi.fn().mockResolvedValue(undefined);const bookmark={key:'q1',owner:'ada',title:'UTME',source:completed.source,question,assets:{},answer:1,createdAt:'2026-10-19'};
  const back=vi.fn();await act(async()=>root.render(<SavedQuestionsScreen bookmarks={[bookmark]} onOpen={open} onRemove={remove} onBack={back} />));
  expect(host.querySelector('header h1')?.textContent).toBe('Saved questions');expect(host.querySelectorAll('h1')).toHaveLength(1);expect(host.querySelector('.wordmark')).toBeNull();
  await click(host.querySelector('[aria-label="Back to Preferences"]'));expect(back).toHaveBeenCalledOnce();
  await click(host.querySelector('.archive-bookmark-open'));expect(open).toHaveBeenCalledWith(bookmark);
  await click(host.querySelector('[aria-label="Remove saved Biology question"]'));expect(remove).toHaveBeenCalledWith('q1');
 });
 it.each([false,true])('allows bookmarking during an exam and corrections (review=%s)',async review=>{
  const save=vi.fn();await act(async()=>root.render(<StudyWorkspace questions={[question]} answers={[1]} flagged={[false]} currentQ={0} timeLeft={60} duration={60} showModal={false} review={review} bookmarked onBookmark={save} onAnswer={()=>{}} onFlag={()=>{}} onQ={()=>{}} onModal={()=>{}} onSubmit={()=>{}} nav={()=>{}} />));
  const button=host.querySelector('[aria-label="Remove saved question"]');expect(button?.getAttribute('aria-pressed')).toBe('true');await click(button);expect(save).toHaveBeenCalledOnce();
 });
});
