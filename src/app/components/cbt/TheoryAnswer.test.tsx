// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TheoryAnswer from './TheoryAnswer';
import type { StudyQuestion } from './StudyWorkspace';
import { isCbtQuestion } from '../../../utils/cbtFilters';

let root: Root, container: HTMLDivElement;
const question: StudyQuestion = {type:'theory',subject:'Chemistry',question:'Explain the reaction',options:[],correct:null,answerText:'SECRET SOURCE SOLUTION',explanation:'SECRET SOURCE SOLUTION',explanationHtml:'<table><tr><td>SECRET SOURCE SOLUTION</td></tr></table>'};
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);container=document.createElement('div');document.body.append(container);root=createRoot(container)});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals()});
function Practice(){const [revealed,reveal]=useState(false);return <TheoryAnswer question={question} revealed={revealed} onReveal={()=>reveal(true)} />}
describe('self-checked theory practice',()=>{
  it('keeps the solution out of the page until the student chooses to reveal it',async()=>{
    await act(async()=>root.render(<Practice />));expect(container.textContent).not.toContain('SECRET SOURCE SOLUTION');expect(container.querySelector('table')).toBeNull();
    await act(async()=>container.querySelector('button')!.click());
    expect(container.querySelector('table')?.textContent).toBe('SECRET SOURCE SOLUTION');expect(container.querySelectorAll('table')).toHaveLength(1);expect(container.querySelector('button')).toBeNull();
  });
  it('keeps theory questions selectable even where the source supplies no solution',async()=>{
    const incomplete={...question,answerText:'',explanation:'',explanationHtml:''};expect(isCbtQuestion(incomplete)).toBe(true);
    await act(async()=>root.render(<TheoryAnswer question={incomplete} revealed onReveal={()=>{}} />));expect(container.textContent).toContain('No answer was supplied');
  });
});
