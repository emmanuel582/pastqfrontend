import MathText from '../MathText';
import type { SourceAssets } from '../../../utils/sourceHtml';
import type { StudyQuestion } from './StudyWorkspace';

const present = (value?: string | null) => Boolean(value?.trim());

/** Source formatting is content too: a diagram-only answer must not disappear. */
export default function AnswerFeedback({ question, assets }: { question: StudyQuestion; assets?: SourceAssets }) {
  const theory = question.type === 'theory';
  const written = theory || question.type === 'short_answer';
  const explanation = { text: question.explanation || '', html: question.explanationHtml };
  const answer = written
    ? { text: question.answerText || (theory ? question.explanation : '') || '', html: question.answerHtml || question.optionsHtml?.[0] || (theory ? question.explanationHtml : undefined) }
    : { text: question.answerText || '', html: question.answerHtml };
  // MCQ options already show the keyed answer. Keep any separate source answer
  // supplied by an upload, while avoiding an exact duplicate of existing HTML.
  const showAnswer = written ? present(answer.text) || present(answer.html)
    : present(answer.html) && answer.html !== explanation.html && !question.optionsHtml?.includes(answer.html!);
  const showExplanation = (present(explanation.text) || present(explanation.html)) && (!written
    || !showAnswer || present(explanation.html) && explanation.html !== answer.html
    || present(explanation.text) && explanation.text !== answer.text);
  const topic = question.topic?.trim();
  if (!showAnswer && !showExplanation && !topic && !theory) return null;
  return <section className="answer-feedback" role={theory ? 'region' : undefined} aria-label={theory ? 'Source answer' : 'Answer explanation'}>
    {topic && <div className="answer-topic"><span>Topic</span><strong>{topic}</strong></div>}
    {showAnswer && <div className="source-answer"><h2>Source answer</h2><MathText text={answer.text} html={answer.html} assets={assets} zoomImages /></div>}
    {showExplanation && <div className="feedback-explanation"><MathText text={explanation.text} html={explanation.html} assets={assets} zoomImages /></div>}
    {theory && !showAnswer && !showExplanation && <p>No answer was supplied for this question.</p>}
  </section>;
}
