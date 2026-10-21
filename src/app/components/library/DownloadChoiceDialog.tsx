import { ArrowRight, Download, ListFilter } from 'lucide-react';
import StudyDialog from '../StudyDialog';

export type DownloadScope = { title: string; ids: string[] };
export type DownloadMode = 'all' | 'select';

export default function DownloadChoiceDialog({ scope, onChoose, onClose }: {
  scope: DownloadScope; onChoose: (mode: DownloadMode) => void; onClose: () => void;
}) {
  return <StudyDialog title="Download subjects" onClose={onClose} className="download-choice-dialog">
    <p className="download-choice-context">{scope.title}{scope.ids.length > 1 && <span>{scope.ids.length} collections</span>}</p>
    <div className="download-choices">
      <button type="button" onClick={() => onChoose('all')}><Download size={22} /><strong>All subjects</strong><ArrowRight size={18} /></button>
      <button type="button" onClick={() => onChoose('select')}><ListFilter size={22} /><strong>Choose subjects</strong><ArrowRight size={18} /></button>
    </div>
  </StudyDialog>;
}
