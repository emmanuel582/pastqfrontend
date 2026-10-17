import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudyWorkspace, type StudyQuestion } from './StudyWorkspace';

const question: StudyQuestion = {
  subject: 'Chemistry', question: 'Which option matches the reaction?',
  options: ['First option', 'Second option'], correct: 1,
  explanation: 'Explanation of the reaction.', answerText: 'Standalone answer text',
};
function render({ practice = false, review = false, selected = 0, explanation = question.explanation } = {}) {
  return renderToStaticMarkup(<StudyWorkspace
    questions={[{ ...question, explanation }]} answers={[selected]} flagged={[false]}
    currentQ={0} timeLeft={1200} duration={1200} showModal={false}
    onAnswer={() => {}} onFlag={() => {}} onQ={() => {}} onModal={() => {}}
    onSubmit={() => {}} nav={() => {}} practice={practice} review={review}
  />);
}
beforeEach(() => vi.stubGlobal('window', { innerWidth: 390, innerHeight: 844 }));
afterEach(() => vi.unstubAllGlobals());

describe('answer visibility', () => {
  it('numbers the active subject separately and offers a subject picker instead of a dropdown', () => {
    const questions = ['Agricultural Science','Chemistry','Computer Studies'].flatMap((subject,index) => Array.from({length:index===0?40:20},()=>({...question,subject})));
    const html = renderToStaticMarkup(<StudyWorkspace questions={questions} answers={Array(80).fill(null)} flagged={Array(80).fill(false)} currentQ={74} timeLeft={3600} duration={3600} showModal={false} onAnswer={()=>{}} onFlag={()=>{}} onQ={()=>{}} onModal={()=>{}} onSubmit={()=>{}} nav={()=>{}} />);
    expect(html).toContain('QUESTION 15');
    expect(html).toContain('/ 20');
    expect(html).toContain('Computer Studies: 0 of 20 answered');
    expect(html).toMatch(/<button[^>]+aria-label="Switch subject"/);
    expect(html).not.toMatch(/<select[^>]+aria-label="Switch subject"/);
    expect(html).not.toContain('QUESTION 75');
  });
  it('accepts a written response without exposing its source answer before submission', () => {
    const props = { questions: [{ ...question, type: 'short_answer', options: ['SECRET-SOURCE-ANSWER'], optionsHtml: ['<div>SECRET-SOURCE-ANSWER</div>'], correct: null, answerText: 'SECRET-SOURCE-ANSWER' }],
      answers: [0], writtenAnswers: ['My written response'], flagged: [false], currentQ: 0, timeLeft: 1200, duration: 1200, showModal: false,
      onAnswer: () => {}, onFlag: () => {}, onQ: () => {}, onModal: () => {}, onSubmit: () => {}, nav: () => {} };
    const exam = renderToStaticMarkup(<StudyWorkspace {...props} />);
    expect(exam).toContain('My written response');
    expect(exam).toContain('textarea');
    expect(exam).not.toContain('SECRET-SOURCE-ANSWER');
    expect(exam).not.toContain('answer-options');
    const review = renderToStaticMarkup(<StudyWorkspace {...props} review />);
    expect(review).toContain('SECRET-SOURCE-ANSWER');
    expect(review).toContain('Source answer');
    expect(review).toMatch(/<textarea[^>]*readonly/i);
  });
  it.each([false, true])('keeps selected answers editable and hides feedback before submission (practice=%s)', practice => {
    for (const selected of [0, 1]) {
      const html = render({ practice, selected });
      expect(html).not.toContain('answer-feedback');
      expect(html).not.toContain('correct-answer');
      expect(html).not.toContain('incorrect-answer');
      expect(html).not.toContain('Standalone answer text');
      expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*class="answer-option/);
    }
  });

  it('shows explanation and reviewed choices only after submission', () => {
    const html = render({ review: true });
    expect(html).toContain('answer-feedback');
    expect(html).toContain('correct-answer');
    expect(html).toContain('incorrect-answer');
    expect(html).not.toContain('Correct answer:');
    expect(html).not.toContain('Standalone answer text');
    expect(html).not.toContain('A little more practice');
    expect(html).toContain('feedback-explanation');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*class="answer-option/);
  });

  it('omits empty feedback when a reviewed question has no explanation', () => {
    expect(render({ review: true, explanation: '' })).not.toContain('answer-feedback');
  });
});
