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
