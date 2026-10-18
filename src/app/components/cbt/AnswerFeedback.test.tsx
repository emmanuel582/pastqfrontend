// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnswerFeedback from './AnswerFeedback';
import TheoryAnswer from './TheoryAnswer';
import { StudyWorkspace, type StudyQuestion } from './StudyWorkspace';
const question: StudyQuestion = {subject:'Biology',question:'Identify the cell.',options:['Plant','Animal'],correct:0,explanation:'',topic:'Cell structure'};
const a='a'.repeat(64), b='b'.repeat(64), assets={ [a]:{mime:'image/png',data:'AA=='},[b]:{mime:'image/png',data:'AQ=='} };
const img=(key:string)=>`<img src="pastq-asset:${key}">`;
let root:Root,host:HTMLDivElement;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');document.body.append(host);root=createRoot(host)});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals()});
async function render(q:StudyQuestion){await act(async()=>root.render(<AnswerFeedback question={q} assets={assets} />))}
describe('original answer diagrams and topics',()=>{
 it('shows an image-only explanation even with no plain-text explanation',async()=>{
  await render({...question,explanationHtml:img(a)});
  expect(host.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AA==');
  expect(host.querySelector('img')?.getAttribute('aria-label')).toBe('Enlarge question image');
  expect(host.querySelector('.answer-topic')?.textContent).toBe('TopicCell structure');
 });
 it('preserves separate diagrams in both the source answer and explanation',async()=>{
  await render({...question,answerHtml:img(a),explanationHtml:img(b)});
  expect([...host.querySelectorAll('img')].map(img=>img.getAttribute('src'))).toEqual(['data:image/png;base64,AA==','data:image/png;base64,AQ==']);
 });
 it('keeps an HTML-only written answer rather than replacing it with an option fallback',async()=>{
  await render({...question,type:'short_answer',optionsHtml:['wrong fallback'],answerHtml:img(a),explanationHtml:img(b)});
  expect(host.querySelectorAll('img')).toHaveLength(2);expect(host.textContent).not.toContain('wrong fallback');
 });
 it('reveals an image-only theory solution and separate explanation without a text gate',async()=>{
  const q={...question,type:'theory',options:[],correct:null,answerHtml:img(a),explanationHtml:img(b)};
  await act(async()=>root.render(<TheoryAnswer question={q} assets={assets} revealed={false} onReveal={()=>{}} />));
  expect(host.querySelectorAll('img')).toHaveLength(0);expect(host.querySelector('.answer-topic')).toBeNull();
  await act(async()=>root.render(<TheoryAnswer question={q} assets={assets} revealed onReveal={()=>{}} />));
  expect(host.querySelectorAll('img')).toHaveLength(2);expect(host.textContent).not.toContain('No answer was supplied');
 });
 it('does not repeat an identical source solution and explanation',async()=>{
  await render({...question,type:'theory',options:[],correct:null,answerHtml:img(a),explanationHtml:img(a)});
  expect(host.querySelectorAll('img')).toHaveLength(1);
 });
 it('shows a topic even without a solution, and never invents a topic or adds difficulty',async()=>{
  await render({...question,...{difficulty:'hard'}});expect(host.querySelector('.answer-topic')?.textContent).toContain('Cell structure');expect(host.textContent).not.toMatch(/difficulty|hard/i);
  await render({...question,topic:'  '});expect(host.querySelector('.answer-topic')).toBeNull();
 });
 it('keeps topics and solution images hidden during the objective exam',async()=>{
  vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});HTMLElement.prototype.scrollTo=vi.fn();
  await act(async()=>root.render(<StudyWorkspace questions={[{...question,explanationHtml:img(a)}]} answers={[null]} flagged={[false]} currentQ={0} timeLeft={60} duration={60} showModal={false} onAnswer={()=>{}} onFlag={()=>{}} onQ={()=>{}} onModal={()=>{}} onSubmit={()=>{}} nav={()=>{}} assets={assets} />));
  expect(host.querySelector('.answer-feedback')).toBeNull();expect(host.querySelectorAll('img')).toHaveLength(0);expect(host.textContent).not.toContain('Cell structure');
 });
});
