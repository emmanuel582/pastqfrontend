import { ArrowRight, Download, ListFilter } from 'lucide-react';
import StudyDialog from '../StudyDialog';
import ScholarMascot from '../ScholarMascot';

export type DownloadScope = { title: string; ids: string[] };
export type DownloadMode = 'all' | 'select';

export default function DownloadChoiceDialog({ scope, onChoose, onClose }: {
  scope: DownloadScope; onChoose: (mode: DownloadMode) => void; onClose: () => void;
}) {
  return <StudyDialog title="Download subjects" onClose={onClose} className="download-choice-dialog">
    <div className="download-choice-intro"><ScholarMascot state="encourage" compact animated /><div><strong>{scope.title}</strong><p>What would you like to save for offline study?</p></div></div>
    <div className="download-choices">
      <button type="button" aria-label="All subjects" onClick={() => onChoose('all')}><Download size={22} /><span><strong>All subjects</strong><small>Save everything in this {scope.ids.length > 1 ? 'selection' : 'collection'}.</small></span><ArrowRight size={18} /></button>
      <button type="button" aria-label="Choose subjects" onClick={() => onChoose('select')}><ListFilter size={22} /><span><strong>Choose subjects</strong><small>Pick only the subjects and papers you need.</small></span><ArrowRight size={18} /></button>
    </div>
  </StudyDialog>;
}
