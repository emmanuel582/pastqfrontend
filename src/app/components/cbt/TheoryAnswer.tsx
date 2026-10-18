import { useId } from 'react';
import MathText from '../MathText';
import type { SourceAssets } from '../../../utils/sourceHtml';
import type { StudyQuestion } from './StudyWorkspace';

export default function TheoryAnswer({ question, assets, revealed, onReveal }: { question: StudyQuestion; assets?: SourceAssets; revealed: boolean; onReveal: () => void }) {
  const id = useId();
  const answer = question.answerText || question.explanation || '';
  const html = question.answerHtml || question.optionsHtml?.[0] || question.explanationHtml;
  const extraImage = [...(question.explanationHtml || '').matchAll(/pastq-asset:([a-f0-9]{64})/g)].some(match => !html?.includes(match[1]));
  const showExplanation = question.explanation && (question.explanation !== answer || extraImage);
  return <section className="theory-answer">
    {!revealed && <button className="study-primary" aria-expanded={false} aria-controls={id} onClick={onReveal}>I’ve solved it — show answer</button>}<div id={id} hidden={!revealed}>{revealed && <div className="answer-feedback" role="region" aria-label="Source answer">
      {answer || html ? <><h2>Source answer</h2><MathText text={answer} html={html} assets={assets} zoomImages />{showExplanation && <MathText text={question.explanation} html={question.explanationHtml} assets={assets} zoomImages />}</> : <p>No answer was supplied for this question.</p>}
    </div>}</div>
  </section>;
}
