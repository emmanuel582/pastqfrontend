import { useId } from 'react';
import AnswerFeedback from './AnswerFeedback';
import type { SourceAssets } from '../../../utils/sourceHtml';
import type { StudyQuestion } from './StudyWorkspace';

export default function TheoryAnswer({ question, assets, revealed, onReveal }: { question: StudyQuestion; assets?: SourceAssets; revealed: boolean; onReveal: () => void }) {
  const id = useId();
  return <section className="theory-answer">
    {!revealed && <button className="study-primary" aria-expanded={false} aria-controls={id} onClick={onReveal}>I’ve solved it — show answer</button>}<div id={id} hidden={!revealed}>{revealed && <AnswerFeedback question={question} assets={assets} />}</div>
  </section>;
}
